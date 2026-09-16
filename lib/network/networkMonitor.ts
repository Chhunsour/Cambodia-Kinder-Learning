import { AppState, AppStateStatus } from "react-native";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/supabaseClient";

export type ConnectionType = "wifi" | "cellular" | "none" | "unknown";

type ConnectivityListener = (isOnline: boolean) => void;

class NetworkMonitor {
  private _isOnline = true;
  private _connectionType: ConnectionType = "wifi";
  private listeners = new Set<ConnectivityListener>();
  private appStateSubscription: any = null;

  constructor() {
    this.init();
  }

  private init() {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          this.checkConnectivity();
        }
      }
    );
  }

  public isOnline(): boolean {
    return this._isOnline;
  }

  public getConnectionType(): ConnectionType {
    if (!this._isOnline) return "none";
    return this._connectionType;
  }

  public setConnectionType(type: ConnectionType) {
    this._connectionType = type;
    if (type === "none") {
      this.setOnline(false);
    }
  }

  public setOnline(online: boolean) {
    if (this._isOnline !== online) {
      this._isOnline = online;
      if (!online) {
        this._connectionType = "none";
      } else if (this._connectionType === "none") {
        this._connectionType = "wifi";
      }
      this.notify();
    }
  }

  public onNetworkSuccess() {
    this.setOnline(true);
  }

  public onNetworkFailure(error?: any) {
    // Check if error is network related
    const msg = error?.message || String(error || "");
    const isNetworkError =
      msg.includes("Network request failed") ||
      msg.includes("Failed to fetch") ||
      msg.includes("fetch failed") ||
      msg.includes("NetworkError") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("offline");

    if (isNetworkError) {
      this.setOnline(false);
    }
  }

  /**
   * Quick non-blocking probe to verify network reachability.
   */
  public async checkConnectivity(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      // Offline-first: if no Supabase configured, treat as local-only
      return true;
    }

    try {
      const client = getSupabaseClient();
      if (!client) {
        return false;
      }

      // Lightweight probe: fetch session or head request with short timeout
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 4000)
      );

      const checkPromise = client.auth.getSession().then(() => true);
      const online = await Promise.race([checkPromise, timeoutPromise]).catch(() => false);

      this.setOnline(Boolean(online));
      return Boolean(online);
    } catch {
      this.setOnline(false);
      return false;
    }
  }

  public addConnectivityListener(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this._isOnline);
      } catch (e) {
        console.warn("[NetworkMonitor] Listener error:", e);
      }
    }
  }
}

export const networkMonitor = new NetworkMonitor();
