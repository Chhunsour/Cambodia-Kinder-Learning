import { SyncStatus } from "@/types";

export type SyncAction = "INSERT" | "UPDATE" | "DELETE";

export interface SyncQueueItem {
  id: string;
  action: SyncAction;
  entityType: string;
  entityId: string;
  payload: string; // JSON payload
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt?: number;
  pendingCount: number;
}
