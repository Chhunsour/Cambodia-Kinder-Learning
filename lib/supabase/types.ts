/**
 * Supabase Database and Cloud Sync Types for Koki.
 * Matches cloud PostgreSQL schema and maps between local SQLite types.
 */

export interface CloudParentProfile {
  id: string; // matches auth.users.id
  created_at: string;
  updated_at: string;
}

export interface CloudChild {
  id: string; // Preserves local child UUID (e.g. child_01 or uuid)
  parent_id: string; // Foreign key to public.profiles.id
  local_origin_id: string;
  nickname: string;
  age: number;
  learning_band: "explorer" | "adventurer" | "champion";
  avatar_id: string;
  ui_language: "km" | "en";
  created_at: string;
  updated_at: string;
}

export interface CloudLessonProgress {
  id: string;
  child_id: string;
  lesson_id: string;
  world_id: string;
  status: "locked" | "unlocked" | "in_progress" | "completed";
  best_stars: number;
  completion_count: number;
  total_attempts: number;
  total_mistakes: number;
  first_completed_at?: string | null;
  last_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudWallet {
  child_id: string;
  coin_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CloudCoinTransaction {
  id: string;
  child_id: string;
  amount: number;
  type: string;
  source_type: string;
  source_id: string;
  description?: string | null;
  created_at: string;
}

export interface CloudCosmeticItem {
  id: string;
  child_id: string;
  item_id: string;
  acquired_at: string;
  source: string;
}

export interface CloudEquippedAppearance {
  child_id: string;
  head_item_id?: string | null;
  face_item_id?: string | null;
  neck_item_id?: string | null;
  body_item_id?: string | null;
  back_item_id?: string | null;
  special_item_id?: string | null;
  updated_at: string;
}

export interface CloudLearningStreak {
  child_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualified_date?: string | null;
  total_qualified_days: number;
  created_at: string;
  updated_at: string;
}

export interface CloudStreakPetProgress {
  child_id: string;
  highest_stage: string;
  current_companion_id: string;
  created_at: string;
  updated_at: string;
}

export interface CloudHeartState {
  child_id: string;
  current_hearts: number;
  max_hearts: number;
  last_regeneration_at: string;
  created_at: string;
  updated_at: string;
}

export interface CloudStreakDay {
  child_id: string;
  day_date: string;
  created_at: string;
}

/**
 * Complete snapshot of a child's local state uploaded to Supabase.
 */
export interface ChildLocalSnapshot {
  child: CloudChild;
  lessonProgress: CloudLessonProgress[];
  wallet: CloudWallet | null;
  transactions: CloudCoinTransaction[];
  inventory: CloudCosmeticItem[];
  appearance: CloudEquippedAppearance | null;
  streak: CloudLearningStreak | null;
  pet: CloudStreakPetProgress | null;
  hearts: CloudHeartState | null;
  streakDays?: CloudStreakDay[];
}

/**
 * Local SQLite cloud binding record.
 */
export interface LocalCloudBinding {
  profile_id: string;
  cloud_child_id: string;
  cloud_parent_id: string;
  bound_at: number;
  last_sync_at: number;
  last_successful_sync_at?: number | null;
  last_pull_at?: number | null;
  last_push_at?: number | null;
  sync_status: "synced" | "syncing" | "pending" | "offline" | "failed";
  sync_error?: string | null;
}

/**
 * Child Friend Code record.
 */
export interface ChildFriendCode {
  child_id: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export type FriendRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface FriendRequest {
  id: string;
  sender_child_id: string;
  receiver_child_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ChildFriendship {
  id: string;
  child_a_id: string;
  child_b_id: string;
  created_at: string;
}

export interface MinimalFriendChild {
  child_id: string;
  nickname: string;
  avatar_id: string;
  is_own_child: boolean;
}

export interface FriendItem {
  friend_id: string;
  nickname: string;
  avatar_id: string;
  friends_since: string;
}

export interface IncomingFriendRequest {
  request_id: string;
  sender_child_id: string;
  sender_nickname: string;
  sender_avatar_id: string;
  created_at: string;
}

export interface OutgoingFriendRequest {
  request_id: string;
  receiver_child_id: string;
  receiver_nickname: string;
  receiver_avatar_id: string;
  created_at: string;
}

export interface CloudLearningStarEvent {
  id: string;
  child_id: string;
  lesson_id: string;
  track_id: string;
  stars_delta: number;
  source_completion_id: string;
  earned_at: string;
  created_at: string;
}

export interface LeaderboardEntry {
  child_id: string;
  nickname: string;
  avatar_id: string;
  weekly_stars: number;
  rank: number;
  is_current_child: boolean;
}

export interface LeaderboardSnapshot {
  week_key: string;
  cached_at: number;
  entries: LeaderboardEntry[];
  current_child_stars: number;
}

