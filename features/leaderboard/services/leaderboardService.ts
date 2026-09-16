import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/supabaseClient";
import { LeaderboardEntry, LeaderboardSnapshot } from "@/lib/supabase/types";
import { StarEventRepository } from "@/storage/repositories/starEventRepository";
import { LeaderboardCacheRepository } from "@/storage/repositories/leaderboardCacheRepository";
import { networkMonitor } from "@/lib/network/networkMonitor";

export interface GetLeaderboardResult {
  entries: LeaderboardEntry[];
  weekKey: string;
  isOffline: boolean;
  isCached: boolean;
  cachedAt?: number;
  currentChildStars: number;
}

/**
 * Returns Monday's date string (YYYY-MM-DD) for the calendar week containing the given date.
 * Consistent across timezones for week grouping.
 */
export function getWeekStartKey(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Returns [startMs, endMs] millisecond boundaries for the given weekKey (YYYY-MM-DD).
 */
export function getWeekBounds(weekKey: string = getWeekStartKey()): {
  startMs: number;
  endMs: number;
} {
  const start = new Date(`${weekKey}T00:00:00.000Z`).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return { startMs: start, endMs: end };
}

/**
 * Re-ranks leaderboard entries descending by weekly_stars.
 * Applies standard competition ranking (same stars = same rank, e.g. 1, 1, 3).
 */
export function rankLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  // Sort descending by score, tiebreaker: nickname, then child_id
  const sorted = [...entries].sort((a, b) => {
    if (b.weekly_stars !== a.weekly_stars) {
      return b.weekly_stars - a.weekly_stars;
    }
    return a.nickname.localeCompare(b.nickname);
  });

  let currentRank = 1;
  return sorted.map((entry, index) => {
    if (index > 0 && entry.weekly_stars < sorted[index - 1].weekly_stars) {
      currentRank = index + 1;
    }
    return {
      ...entry,
      rank: currentRank,
    };
  });
}

/**
 * Domain Service for the Friends-Only Weekly Learning Leaderboard.
 */
export const LeaderboardService = {
  /**
   * Fetch current week's leaderboard for a child profile.
   * Pulls from secure RPC when online, falling back to SQLite cache + local events when offline.
   */
  async getWeeklyLeaderboard(
    profileId: string,
    cloudChildId?: string | null,
    nickname: string = "You",
    avatarId: string = "avatar_01"
  ): Promise<GetLeaderboardResult> {
    const weekKey = getWeekStartKey();
    const { startMs, endMs } = getWeekBounds(weekKey);
    const localWeeklyStars = await StarEventRepository.getWeeklyStarsForProfile(
      profileId,
      startMs,
      endMs
    );

    // 1. Online & Cloud-Bound: Query Supabase secure RPC
    if (networkMonitor.isOnline() && cloudChildId && isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client.rpc("get_friends_weekly_leaderboard", {
            p_child_id: cloudChildId,
            p_week_key: weekKey,
          });

          if (!error && Array.isArray(data)) {
            let entries: LeaderboardEntry[] = data.map((row: any) => ({
              child_id: row.child_id,
              nickname: row.nickname,
              avatar_id: row.avatar_id,
              weekly_stars: Number(row.weekly_stars || 0),
              rank: Number(row.rank || 1),
              is_current_child: Boolean(row.is_current_child),
            }));

            // If current child has newer local SQLite stars not yet synced, reflect it immediately
            entries = entries.map((e) => {
              if (e.is_current_child) {
                return {
                  ...e,
                  weekly_stars: Math.max(e.weekly_stars, localWeeklyStars),
                };
              }
              return e;
            });

            // Ensure current child exists in list even if RPC returned empty
            if (!entries.some((e) => e.is_current_child)) {
              entries.push({
                child_id: cloudChildId,
                nickname,
                avatar_id: avatarId,
                weekly_stars: localWeeklyStars,
                rank: 1,
                is_current_child: true,
              });
            }

            // Re-rank in case local score was higher
            entries = rankLeaderboardEntries(entries);

            const myStars =
              entries.find((e) => e.is_current_child)?.weekly_stars ?? localWeeklyStars;

            // Cache snapshot for offline display
            const snapshot: LeaderboardSnapshot = {
              week_key: weekKey,
              cached_at: Date.now(),
              entries,
              current_child_stars: myStars,
            };
            LeaderboardCacheRepository.setCachedLeaderboard(
              profileId,
              weekKey,
              snapshot
            ).catch(() => {});

            return {
              entries,
              weekKey,
              isOffline: false,
              isCached: false,
              currentChildStars: myStars,
            };
          } else if (error) {
            console.warn("[LeaderboardService] RPC error:", error);
          }
        } catch (err) {
          console.warn("[LeaderboardService] Exception querying RPC:", err);
        }
      }
    }

    // 2. Offline / Error / Unbound: Use local SQLite cache
    const cached = await LeaderboardCacheRepository.getCachedLeaderboard(profileId, weekKey);
    if (cached && cached.entries && cached.entries.length > 0) {
      let entries = cached.entries.map((e) => {
        if (e.is_current_child) {
          return {
            ...e,
            weekly_stars: Math.max(e.weekly_stars, localWeeklyStars),
          };
        }
        return e;
      });

      entries = rankLeaderboardEntries(entries);
      const myStars =
        entries.find((e) => e.is_current_child)?.weekly_stars ?? localWeeklyStars;

      return {
        entries,
        weekKey,
        isOffline: true,
        isCached: true,
        cachedAt: cached.cached_at,
        currentChildStars: myStars,
      };
    }

    // 3. Fallback: Self-only row when no cache exists
    const selfEntry: LeaderboardEntry = {
      child_id: cloudChildId || profileId,
      nickname,
      avatar_id: avatarId,
      weekly_stars: localWeeklyStars,
      rank: 1,
      is_current_child: true,
    };

    return {
      entries: [selfEntry],
      weekKey,
      isOffline: !networkMonitor.isOnline(),
      isCached: false,
      currentChildStars: localWeeklyStars,
    };
  },
};
