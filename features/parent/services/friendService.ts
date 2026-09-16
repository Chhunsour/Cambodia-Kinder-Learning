import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/supabaseClient";
import {
  ChildFriendCode,
  MinimalFriendChild,
  FriendItem,
  IncomingFriendRequest,
  OutgoingFriendRequest,
} from "@/lib/supabase/types";
import {
  generateFriendCode,
  normalizeFriendCode,
  isValidFriendCodeFormat,
} from "./friendCodeGenerator";
import { networkMonitor } from "@/lib/network/networkMonitor";
import { AppSettingsRepository } from "@/storage/repositories/appSettingsRepository";

const CACHE_KEY_FRIENDS_PREFIX = "cached_friends_list_";

export interface FriendActionResult {
  success: boolean;
  error?: string;
  autoAccepted?: boolean;
}

/**
 * Domain Service for parent-controlled child friendships and friend codes.
 * Purely cloud-backed; never calls Supabase directly from UI components.
 */
export const FriendService = {
  /**
   * Get an existing friend code or generate a fresh one for a cloud child profile.
   */
  async getOrCreateFriendCode(childId: string): Promise<{
    success: boolean;
    code?: string;
    error?: string;
  }> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      // 1. Query existing code
      const { data, error } = await client
        .from("child_friend_codes")
        .select("code")
        .eq("child_id", childId)
        .maybeSingle();

      if (error) {
        console.warn("[FriendService] Error fetching friend code:", error);
      }

      if (data?.code) {
        return { success: true, code: data.code };
      }

      // 2. Generate and store initial code
      const newCode = generateFriendCode();
      const rotateRes = await this.rotateFriendCode(childId, newCode);
      if (rotateRes.success && rotateRes.newCode) {
        return { success: true, code: rotateRes.newCode };
      }

      return { success: false, error: rotateRes.error || "FAILED_TO_GENERATE" };
    } catch (err: any) {
      console.warn("[FriendService] Exception in getOrCreateFriendCode:", err);
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Rotate a child's friend code. Invalidates previous code.
   */
  async rotateFriendCode(
    childId: string,
    specificCode?: string
  ): Promise<{ success: boolean; newCode?: string; error?: string }> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    const codeToUse = specificCode || generateFriendCode();

    try {
      const { data, error } = await client.rpc("rotate_friend_code", {
        p_child_id: childId,
        p_new_code: codeToUse,
      });

      if (error) {
        console.warn("[FriendService] RPC rotate_friend_code error:", error);
        return { success: false, error: error.message };
      }

      const res = data as any;
      if (res?.success) {
        return { success: true, newCode: codeToUse };
      }

      return { success: false, error: res?.error || "ROTATION_FAILED" };
    } catch (err: any) {
      console.warn("[FriendService] Exception rotating code:", err);
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Lookup a friend code to confirm minimal identity (nickname, avatar).
   * Strictly avoids exposing private profile details.
   */
  async lookupFriendCode(code: string): Promise<{
    success: boolean;
    child?: MinimalFriendChild;
    error?: string;
  }> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    if (!isValidFriendCodeFormat(code)) {
      return { success: false, error: "INVALID_FORMAT" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      const normalized = normalizeFriendCode(code);
      const { data, error } = await client.rpc("lookup_friend_code", {
        p_code: normalized,
      });

      if (error) {
        console.warn("[FriendService] RPC lookup_friend_code error:", error);
        return { success: false, error: error.message };
      }

      const rows = (data as any[]) || [];
      if (rows.length === 0) {
        return { success: false, error: "CODE_NOT_FOUND" };
      }

      const child = rows[0] as MinimalFriendChild;
      return { success: true, child };
    } catch (err: any) {
      console.warn("[FriendService] Exception looking up friend code:", err);
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Send a friend request to another child by code.
   * Handles reciprocal requests (auto-approves if already requested).
   */
  async sendFriendRequest(
    senderChildId: string,
    code: string
  ): Promise<FriendActionResult> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    const normalized = normalizeFriendCode(code);

    try {
      const { data, error } = await client.rpc("send_friend_request", {
        p_sender_child_id: senderChildId,
        p_friend_code: normalized,
      });

      if (error) {
        console.warn("[FriendService] RPC send_friend_request error:", error);
        return { success: false, error: error.message };
      }

      const res = data as any;
      return {
        success: Boolean(res?.success),
        error: res?.error,
        autoAccepted: Boolean(res?.auto_accepted),
      };
    } catch (err: any) {
      console.warn("[FriendService] Exception sending friend request:", err);
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Retrieve incoming pending requests directed to this child.
   */
  async getIncomingRequests(childId: string): Promise<IncomingFriendRequest[]> {
    if (!networkMonitor.isOnline()) return [];

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await client.rpc("get_child_incoming_requests", {
        p_child_id: childId,
      });

      if (error) {
        console.warn("[FriendService] Error getting incoming requests:", error);
        return [];
      }

      return (data as IncomingFriendRequest[]) || [];
    } catch (err) {
      console.warn("[FriendService] Exception in getIncomingRequests:", err);
      return [];
    }
  },

  /**
   * Retrieve outgoing pending requests initiated by this child.
   */
  async getOutgoingRequests(childId: string): Promise<OutgoingFriendRequest[]> {
    if (!networkMonitor.isOnline()) return [];

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await client.rpc("get_child_outgoing_requests", {
        p_child_id: childId,
      });

      if (error) {
        console.warn("[FriendService] Error getting outgoing requests:", error);
        return [];
      }

      return (data as OutgoingFriendRequest[]) || [];
    } catch (err) {
      console.warn("[FriendService] Exception in getOutgoingRequests:", err);
      return [];
    }
  },

  /**
   * Accept an incoming friend request. Only callable by receiver child's parent.
   */
  async acceptRequest(requestId: string): Promise<FriendActionResult> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      const { data, error } = await client.rpc("accept_friend_request", {
        p_request_id: requestId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const res = data as any;
      return { success: Boolean(res?.success), error: res?.error };
    } catch (err: any) {
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Decline an incoming friend request.
   */
  async declineRequest(requestId: string): Promise<FriendActionResult> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      const { data, error } = await client.rpc("decline_friend_request", {
        p_request_id: requestId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const res = data as any;
      return { success: Boolean(res?.success), error: res?.error };
    } catch (err: any) {
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Cancel an outgoing friend request initiated by caller's child.
   */
  async cancelRequest(requestId: string): Promise<FriendActionResult> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      const { data, error } = await client.rpc("cancel_friend_request", {
        p_request_id: requestId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const res = data as any;
      return { success: Boolean(res?.success), error: res?.error };
    } catch (err: any) {
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Remove a mutual friendship. Does not impact progress, stars, or coins.
   */
  async removeFriend(
    childId: string,
    friendChildId: string
  ): Promise<FriendActionResult> {
    if (!networkMonitor.isOnline()) {
      return { success: false, error: "OFFLINE" };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      const { data, error } = await client.rpc("remove_friend", {
        p_child_id: childId,
        p_friend_child_id: friendChildId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const res = data as any;
      return { success: Boolean(res?.success), error: res?.error };
    } catch (err: any) {
      return { success: false, error: err?.message || "ERROR" };
    }
  },

  /**
   * Fetch approved friends for a child profile. Caches list locally for offline view.
   */
  async getFriendsList(childId: string): Promise<FriendItem[]> {
    if (!networkMonitor.isOnline()) {
      return this.getCachedFriendsList(childId);
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return this.getCachedFriendsList(childId);
    }

    try {
      const { data, error } = await client.rpc("get_child_friends", {
        p_child_id: childId,
      });

      if (error) {
        console.warn("[FriendService] Error fetching friends list:", error);
        return this.getCachedFriendsList(childId);
      }

      const list = (data as FriendItem[]) || [];
      // Cache list in SQLite AppSettings for offline rendering
      AppSettingsRepository.set(
        `${CACHE_KEY_FRIENDS_PREFIX}${childId}`,
        JSON.stringify(list)
      ).catch(() => {});

      return list;
    } catch (err) {
      console.warn("[FriendService] Exception in getFriendsList:", err);
      return this.getCachedFriendsList(childId);
    }
  },

  /**
   * Retrieve cached friends list from local storage during offline periods.
   */
  async getCachedFriendsList(childId: string): Promise<FriendItem[]> {
    try {
      const raw = await AppSettingsRepository.get(
        `${CACHE_KEY_FRIENDS_PREFIX}${childId}`
      );
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("[FriendService] Failed reading cached friends:", e);
    }
    return [];
  },
};
