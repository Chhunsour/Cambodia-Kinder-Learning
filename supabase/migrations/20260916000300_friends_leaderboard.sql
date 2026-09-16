-- ==============================================================================
-- KOKI SUPABASE MIGRATION: FRIENDS-ONLY WEEKLY LEARNING LEADERBOARD
-- Migration: 20260916000300_friends_leaderboard.sql
--
-- Features:
-- 1. learning_star_events: Durable ledger of stars earned from valid lesson completions.
--    - Enforces uniqueness on source_completion_id to prevent duplicate star awards.
--    - Constrains stars_delta to positive improvements (1 to 3).
-- 2. get_friends_weekly_leaderboard: Security Definer RPC
--    - Validates that caller is the parent of the requested child.
--    - Returns aggregated weekly stars for current child + approved friends only.
--    - Preserves ties (RANK() OVER (ORDER BY weekly_stars DESC)).
--    - Excludes removed friendships and strangers completely.
-- ==============================================================================

-- 1. Table: learning_star_events
CREATE TABLE IF NOT EXISTS public.learning_star_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id TEXT NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    track_id TEXT NOT NULL DEFAULT 'world-1',
    stars_delta SMALLINT NOT NULL CHECK (stars_delta >= 1 AND stars_delta <= 3),
    source_completion_id TEXT NOT NULL UNIQUE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient weekly range queries
CREATE INDEX IF NOT EXISTS idx_star_events_child_earned
    ON public.learning_star_events (child_id, earned_at);

CREATE INDEX IF NOT EXISTS idx_star_events_earned_at
    ON public.learning_star_events (earned_at);

-- Row Level Security (RLS)
ALTER TABLE public.learning_star_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their children star events" ON public.learning_star_events;
CREATE POLICY "Parents can view their children star events"
    ON public.learning_star_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = learning_star_events.child_id
              AND c.parent_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Parents can insert their children star events" ON public.learning_star_events;
CREATE POLICY "Parents can insert their children star events"
    ON public.learning_star_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = learning_star_events.child_id
              AND c.parent_id = auth.uid()
        )
    );

-- ==============================================================================
-- 2. Secure RPC: get_friends_weekly_leaderboard
--
-- Calculates the current week's friendly leaderboard:
-- - Validates parent ownership of p_child_id
-- - Gathers self + approved friends from child_friendships
-- - Aggregates weekly stars earned between Monday 00:00:00 UTC and +7 days
-- - Ranks descending with friendly tie support (identical scores get identical rank)
-- - Strictly returns minimal safe display data
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_friends_weekly_leaderboard(
    p_child_id TEXT,
    p_week_key TEXT DEFAULT NULL
)
RETURNS TABLE (
    child_id TEXT,
    nickname TEXT,
    avatar_id TEXT,
    weekly_stars BIGINT,
    rank BIGINT,
    is_current_child BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parent_id UUID;
    v_week_start TIMESTAMPTZ;
    v_week_end TIMESTAMPTZ;
BEGIN
    -- 1. Verify caller owns p_child_id
    SELECT c.parent_id INTO v_parent_id
    FROM public.children c
    WHERE c.id = p_child_id;

    IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Child profile does not belong to caller';
    END IF;

    -- 2. Determine week boundaries (Monday 00:00:00 UTC to Sunday 23:59:59.999 UTC)
    IF p_week_key IS NULL OR p_week_key = '' THEN
        v_week_start := date_trunc('week', now() AT TIME ZONE 'UTC');
    ELSE
        -- p_week_key format is YYYY-MM-DD representing the Monday
        v_week_start := (p_week_key || ' 00:00:00+00')::TIMESTAMPTZ;
    END IF;
    v_week_end := v_week_start + INTERVAL '7 days';

    -- 3. Gather approved friends + self and compute weekly star totals
    RETURN QUERY
    WITH authorized_participants AS (
        -- Current child (Self)
        SELECT
            c.id AS p_id,
            c.nickname AS p_nickname,
            c.avatar_id AS p_avatar_id,
            true AS is_self
        FROM public.children c
        WHERE c.id = p_child_id

        UNION

        -- Approved mutual friends only
        SELECT
            c.id AS p_id,
            c.nickname AS p_nickname,
            c.avatar_id AS p_avatar_id,
            false AS is_self
        FROM public.child_friendships f
        JOIN public.children c ON (
            c.id = CASE
                WHEN f.child_a_id = p_child_id THEN f.child_b_id
                ELSE f.child_a_id
            END
        )
        WHERE f.child_a_id = p_child_id OR f.child_b_id = p_child_id
    ),
    aggregated_scores AS (
        SELECT
            ap.p_id AS a_child_id,
            ap.p_nickname AS a_nickname,
            ap.p_avatar_id AS a_avatar_id,
            ap.is_self AS a_is_self,
            COALESCE(SUM(e.stars_delta), 0)::BIGINT AS a_weekly_stars
        FROM authorized_participants ap
        LEFT JOIN public.learning_star_events e ON (
            e.child_id = ap.p_id
            AND e.earned_at >= v_week_start
            AND e.earned_at < v_week_end
        )
        GROUP BY ap.p_id, ap.p_nickname, ap.p_avatar_id, ap.is_self
    ),
    ranked_results AS (
        SELECT
            score.a_child_id AS r_child_id,
            score.a_nickname AS r_nickname,
            score.a_avatar_id AS r_avatar_id,
            score.a_weekly_stars AS r_weekly_stars,
            RANK() OVER (ORDER BY score.a_weekly_stars DESC) AS r_rank,
            score.a_is_self AS r_is_current_child
        FROM aggregated_scores score
    )
    SELECT
        r.r_child_id AS child_id,
        r.r_nickname AS nickname,
        r.r_avatar_id AS avatar_id,
        r.r_weekly_stars AS weekly_stars,
        r.r_rank AS rank,
        r.r_is_current_child AS is_current_child
    FROM ranked_results r
    ORDER BY r.r_weekly_stars DESC, r.r_nickname ASC, r.r_child_id ASC;
END;
$$;
