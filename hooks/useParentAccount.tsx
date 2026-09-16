import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/supabaseClient";
import { LocalCloudBinding, CloudChild } from "@/lib/supabase/types";
import { CloudBindingRepository } from "@/storage/repositories/cloudBindingRepository";
import { SyncQueueRepository } from "@/storage/repositories/syncQueueRepository";
import { ChildProfileRepository } from "@/storage/repositories/childProfileRepository";
import { CloudSyncService, BindResult, SyncResult } from "@/features/parent/services/cloudSyncService";
import { useActiveProfile } from "./useActiveProfile";

import { SyncService, SyncUIStatus } from "@/features/parent/services/syncService";
import { networkMonitor } from "@/lib/network/networkMonitor";

export type ParentAccountStatus =
  | "loading"
  | "guest"
  | "authenticated"
  | "unconfirmed_email";

interface ParentAccountContextValue {
  status: ParentAccountStatus;
  user: User | null;
  email: string | null;
  isBound: boolean;
  bindingInfo: LocalCloudBinding | null;
  isConfigured: boolean;
  syncUIStatus: SyncUIStatus;
  pendingSyncCount: number;
  failedSyncCount: number;
  existingCloudChildren: CloudChild[];
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string) => Promise<{ success: boolean; needsEmailConfirmation?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  bindCurrentProfile: (allowMultipleChildren?: boolean) => Promise<BindResult>;
  restoreCloudChild: (cloudChildId: string) => Promise<{ success: boolean; error?: string }>;
  mergeWithCloudChild: (cloudChildId: string) => Promise<{ success: boolean; error?: string }>;
  syncNow: () => Promise<SyncResult>;
  retryFailedSync: () => Promise<void>;
  refreshAccountState: () => Promise<void>;
  deleteAccount: (preserveLocalData: boolean) => Promise<{ success: boolean; error?: string }>;
}

const ParentAccountContext = createContext<ParentAccountContextValue | null>(null);

/**
 * Translate technical Supabase Auth errors into parent-friendly messages.
 */
function formatAuthError(err: any): string {
  if (!err) return "An unknown error occurred. Please try again.";
  const msg = (err.message || String(err)).toLowerCase();

  if (msg.includes("invalid login") || msg.includes("invalid credential")) {
    return "Incorrect email or password. Please check and try again.";
  }
  if (msg.includes("already registered") || msg.includes("user already exists")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (msg.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (msg.includes("valid email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network connection unavailable. Your local progress remains completely safe.";
  }
  return "Unable to connect to account. Please try again later.";
}

interface ParentAccountProviderProps {
  children: ReactNode;
}

/**
 * Provider managing optional parent account authentication and cloud binding status.
 */
export function ParentAccountProvider({ children }: ParentAccountProviderProps) {
  const { profile } = useActiveProfile();
  const [status, setStatus] = useState<ParentAccountStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [bindingInfo, setBindingInfo] = useState<LocalCloudBinding | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Load binding for active profile
  const refreshBinding = useCallback(async () => {
    if (!profile?.id) {
      setBindingInfo(null);
      return;
    }
    const binding = await CloudBindingRepository.getBindingByProfileId(profile.id);
    setBindingInfo(binding);
  }, [profile?.id]);

  // Check auth session
  const refreshAccountState = useCallback(async () => {
    if (!isConfigured) {
      setStatus("guest");
      setUser(null);
      await refreshBinding();
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setStatus("guest");
      setUser(null);
      await refreshBinding();
      return;
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session?.user) {
        setStatus("guest");
        setUser(null);
      } else {
        setUser(data.session.user);
        setStatus("authenticated");
      }
    } catch (e) {
      console.warn("[ParentAccountProvider] Failed reading auth session:", e);
      setStatus("guest");
      setUser(null);
    } finally {
      await refreshBinding();
    }
  }, [isConfigured, refreshBinding]);

  useEffect(() => {
    refreshAccountState();

    const client = getSupabaseClient();
    if (!client) return;

    const { data: authListener } = client.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setStatus("authenticated");
        } else {
          setUser(null);
          setStatus("guest");
        }
        await refreshBinding();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshAccountState, refreshBinding]);

  const signIn = useCallback(
    async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
      const client = getSupabaseClient();
      if (!client) {
        return {
          success: false,
          error: "Cloud sync is currently disabled (no Supabase configuration). Progress remains safe on this device.",
        };
      }

      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          return { success: false, error: formatAuthError(error) };
        }

        if (data.user) {
          setUser(data.user);
          setStatus("authenticated");
          await refreshBinding();
          return { success: true };
        }

        return { success: false, error: "Authentication failed. Please try again." };
      } catch (e) {
        return { success: false, error: formatAuthError(e) };
      }
    },
    [refreshBinding]
  );

  const signUp = useCallback(
    async (
      email: string,
      pass: string
    ): Promise<{ success: boolean; needsEmailConfirmation?: boolean; error?: string }> => {
      const client = getSupabaseClient();
      if (!client) {
        return {
          success: false,
          error: "Cloud sync is currently disabled (no Supabase configuration). Progress remains safe on this device.",
        };
      }

      try {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          return { success: false, error: formatAuthError(error) };
        }

        if (data.session?.user) {
          setUser(data.session.user);
          setStatus("authenticated");
          await refreshBinding();
          return { success: true, needsEmailConfirmation: false };
        } else if (data.user) {
          // Signup succeeded but email confirmation is pending
          setStatus("unconfirmed_email");
          return { success: true, needsEmailConfirmation: true };
        }

        return { success: false, error: "Failed to create parent account. Please try again." };
      } catch (e) {
        return { success: false, error: formatAuthError(e) };
      }
    },
    [refreshBinding]
  );

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn("[ParentAccountProvider] Error signing out:", e);
      }
    }
    // Local data remains 100% untouched!
    setUser(null);
    setStatus("guest");
    setExistingCloudChildren([]);
    await refreshBinding();
  }, [refreshBinding]);

  const [syncUIStatus, setSyncUIStatus] = useState<SyncUIStatus>("saved_locally");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [existingCloudChildren, setExistingCloudChildren] = useState<CloudChild[]>([]);

  const isBound = useMemo(() => {
    return Boolean(bindingInfo && bindingInfo.cloud_child_id);
  }, [bindingInfo]);

  // Refresh sync status
  const refreshSyncStatus = useCallback(async () => {
    if (!profile?.id) {
      setSyncUIStatus("saved_locally");
      setPendingSyncCount(0);
      setFailedSyncCount(0);
      return;
    }
    const res = await SyncService.getSyncStatus(profile.id);
    setSyncUIStatus(res.status);
    setPendingSyncCount(res.pendingCount);
    setFailedSyncCount(res.failedCount);
  }, [profile?.id]);

  useEffect(() => {
    refreshSyncStatus();
  }, [profile?.id, bindingInfo, refreshSyncStatus]);

  // Network listener: auto-sync when online
  useEffect(() => {
    if (!profile?.id || !isBound) return;

    const unsubscribe = networkMonitor.addConnectivityListener((isOnline) => {
      if (isOnline) {
        SyncService.syncProfile(profile.id).then(() => {
          refreshBinding();
          refreshSyncStatus();
        }).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.id, isBound, refreshBinding, refreshSyncStatus]);

  const bindCurrentProfile = useCallback(
    async (allowMultipleChildren = false): Promise<BindResult> => {
      if (!profile?.id || !user?.id) {
        return { success: false, error: "No active profile or authenticated parent." };
      }

      const res = await CloudSyncService.bindLocalProfileToAccount(
        profile.id,
        user.id,
        allowMultipleChildren
      );
      if (res.existingCloudDataFound) {
        const cloudCheck = await CloudSyncService.checkExistingCloudData(user.id);
        setExistingCloudChildren(cloudCheck.children);
      }
      if (res.success) {
        setExistingCloudChildren([]);
        await refreshBinding();
        await refreshSyncStatus();
      }
      return res;
    },
    [profile?.id, user?.id, refreshBinding, refreshSyncStatus]
  );

  const restoreCloudChild = useCallback(
    async (cloudChildId: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: "No authenticated parent account." };
      }
      setSyncUIStatus("syncing");
      const res = await CloudSyncService.restoreCloudChild(cloudChildId, user.id);
      if (res.success) {
        setExistingCloudChildren([]);
        await refreshBinding();
        await refreshSyncStatus();
      }
      return res;
    },
    [user?.id, refreshBinding, refreshSyncStatus]
  );

  const mergeWithCloudChild = useCallback(
    async (cloudChildId: string): Promise<{ success: boolean; error?: string }> => {
      if (!profile?.id || !user?.id) {
        return { success: false, error: "No active profile or authenticated parent." };
      }
      setSyncUIStatus("syncing");
      const res = await CloudSyncService.mergeLocalIntoCloudChild(
        profile.id,
        cloudChildId,
        user.id
      );
      if (res.success) {
        setExistingCloudChildren([]);
        await refreshBinding();
        await refreshSyncStatus();
      }
      return res;
    },
    [profile?.id, user?.id, refreshBinding, refreshSyncStatus]
  );

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!profile?.id) {
      return { success: false, error: "No active child profile." };
    }

    setSyncUIStatus("syncing");
    const res = await SyncService.syncProfile(profile.id, true);
    await refreshBinding();
    await refreshSyncStatus();

    return {
      success: res.success,
      error: res.error,
      syncedAt: Date.now(),
    };
  }, [profile?.id, refreshBinding, refreshSyncStatus]);

  const retryFailedSync = useCallback(async (): Promise<void> => {
    if (!profile?.id) return;
    setSyncUIStatus("syncing");
    await SyncService.retryFailedSyncItems(profile.id);
    await refreshBinding();
    await refreshSyncStatus();
  }, [profile?.id, refreshBinding, refreshSyncStatus]);

  const deleteAccount = useCallback(
    async (preserveLocalData: boolean): Promise<{ success: boolean; error?: string }> => {
      const client = getSupabaseClient();
      if (!client || !user?.id) {
        return { success: false, error: "No authenticated parent account to delete." };
      }

      try {
        // 1. Invoke Supabase RPC to delete parent account and cascade-delete all cloud data
        const { error: rpcError } = await client.rpc("delete_parent_account");
        if (rpcError) {
          console.warn("[useParentAccount] delete_parent_account RPC error, trying direct delete:", rpcError);
          // Fallback: direct child table deletion
          await client.from("children").delete().eq("parent_id", user.id);
          await client.from("profiles").delete().eq("id", user.id);
        }

        // 2. Handle local data according to parent choice
        if (preserveLocalData) {
          // Keep local child profiles, but decouple from deleted cloud account
          if (profile?.id) {
            await CloudBindingRepository.deleteBinding(profile.id);
            await SyncQueueRepository.clearQueue(profile.id);
          }
        } else {
          // Delete local child profile as well
          if (profile?.id) {
            await ChildProfileRepository.deleteChildProfile(profile.id);
          }
        }

        // 3. Sign out of Supabase session and clean tokens
        await client.auth.signOut();
        setUser(null);
        setStatus("guest");
        setBindingInfo(null);
        setExistingCloudChildren([]);
        await refreshBinding();
        await refreshSyncStatus();

        return { success: true };
      } catch (err: any) {
        console.warn("[useParentAccount] Exception during account deletion:", err);
        return { success: false, error: err.message || "Failed to delete account." };
      }
    },
    [user?.id, profile?.id, refreshBinding, refreshSyncStatus]
  );

  const value = useMemo<ParentAccountContextValue>(
    () => ({
      status,
      user,
      email: user?.email || null,
      isBound,
      bindingInfo,
      isConfigured,
      syncUIStatus,
      pendingSyncCount,
      failedSyncCount,
      existingCloudChildren,
      signIn,
      signUp,
      signOut,
      bindCurrentProfile,
      restoreCloudChild,
      mergeWithCloudChild,
      syncNow,
      retryFailedSync,
      refreshAccountState,
      deleteAccount,
    }),
    [
      status,
      user,
      isBound,
      bindingInfo,
      isConfigured,
      syncUIStatus,
      pendingSyncCount,
      failedSyncCount,
      existingCloudChildren,
      signIn,
      signUp,
      signOut,
      bindCurrentProfile,
      restoreCloudChild,
      mergeWithCloudChild,
      syncNow,
      retryFailedSync,
      refreshAccountState,
      deleteAccount,
    ]
  );

  return (
    <ParentAccountContext.Provider value={value}>
      {children}
    </ParentAccountContext.Provider>
  );
}

/**
 * Hook to consume parent account auth, cloud binding, and sync operations.
 */
export function useParentAccount(): ParentAccountContextValue {
  const context = useContext(ParentAccountContext);
  if (!context) {
    throw new Error("useParentAccount must be used within a ParentAccountProvider");
  }
  return context;
}
