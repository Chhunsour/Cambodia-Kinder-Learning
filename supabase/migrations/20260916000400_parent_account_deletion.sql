-- ==============================================================================
-- KOKI SUPABASE MIGRATION: PARENT ACCOUNT & CLOUD DATA DELETION
-- Migration: 20260916000400_parent_account_deletion.sql
--
-- Complies with:
-- - Apple App Store Review Guideline 5.1.1(v) (In-app account deletion)
-- - Google Play User Data Policy (Account deletion & associated data deletion)
-- - COPPA / GDPR-K Right to Erasure
--
-- Security Definer RPC: public.delete_parent_account()
-- - Verifies authenticated caller
-- - Cascade-deletes all child records and associated learning history
-- - Deletes parent profile and auth user record
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_parent_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_parent_id UUID := auth.uid();
BEGIN
    IF v_parent_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Must be an authenticated parent to delete account';
    END IF;

    -- 1. Delete all children belonging to this parent
    -- Cascades to: lesson_progress, wallets, coin_transactions, cosmetic_inventory,
    -- equipped_cosmetics, learning_streaks, streak_pet_progress, heart_state,
    -- streak_days, child_friend_codes, friend_requests, child_friendships,
    -- learning_star_events
    DELETE FROM public.children WHERE parent_id = v_parent_id;

    -- 2. Delete parent profile row
    DELETE FROM public.profiles WHERE id = v_parent_id;

    -- 3. Delete from auth.users to permanently revoke credentials
    DELETE FROM auth.users WHERE id = v_parent_id;
END;
$$;

-- Grant execution to authenticated users only
REVOKE ALL ON FUNCTION public.delete_parent_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_parent_account() TO authenticated;
