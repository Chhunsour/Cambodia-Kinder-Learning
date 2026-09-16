import { getDatabase } from "../database";
import { TABLE_WALLETS, TABLE_COIN_TRANSACTIONS } from "../database/schema";
import {
  WalletRow,
  CoinTransactionRow,
  CreateCoinTransactionDTO,
  CoinTransactionType,
} from "../database/types";

export interface CoinWallet {
  profileId: string;
  coinBalance: number;
  createdAt: number;
  updatedAt: number;
}

export interface CoinTransaction {
  id: string;
  profileId: string;
  amount: number;
  type: CoinTransactionType;
  sourceType: string;
  sourceId: string;
  description: string | null;
  createdAt: number;
}

/**
 * Generate collision-resistant ID for coin transaction ledger entries.
 */
export function generateCoinTransactionId(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `tx_${Date.now().toString(36)}_${s4()}${s4()}`;
}

function mapRowToWallet(row: WalletRow): CoinWallet {
  return {
    profileId: row.profile_id,
    coinBalance: row.coin_balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTransaction(row: CoinTransactionRow): CoinTransaction {
  return {
    id: row.id,
    profileId: row.profile_id,
    amount: row.amount,
    type: row.type as CoinTransactionType,
    sourceType: row.source_type,
    sourceId: row.source_id,
    description: row.description,
    createdAt: row.created_at,
  };
}

/**
 * Typed repository for Wallets and Coin Transaction Ledger stored in SQLite.
 * Ensures strict profile isolation, atomic transactional balance updates, and zero SQL leaks into UI.
 */
export const WalletRepository = {
  /**
   * Get the wallet for a child profile.
   * If none exists yet, returns a virtual wallet with 0 balance.
   */
  async getWallet(profileId: string): Promise<CoinWallet> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<WalletRow>(
        `SELECT * FROM ${TABLE_WALLETS} WHERE profile_id = ?;`,
        [profileId]
      );

      if (row) {
        return mapRowToWallet(row);
      }

      const now = Date.now();
      return {
        profileId,
        coinBalance: 0,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.warn(`[WalletRepository] Failed to get wallet for profile "${profileId}":`, error);
      const now = Date.now();
      return {
        profileId,
        coinBalance: 0,
        createdAt: now,
        updatedAt: now,
      };
    }
  },

  /**
   * Get the current coin balance for a child profile.
   */
  async getCoinBalance(profileId: string): Promise<number> {
    const wallet = await this.getWallet(profileId);
    return wallet.coinBalance;
  },

  /**
   * Check whether a transaction has already been recorded for a specific source.
   * Used for deterministic duplicate prevention.
   */
  async hasTransaction(
    profileId: string,
    sourceType: string,
    sourceId: string
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM ${TABLE_COIN_TRANSACTIONS} WHERE profile_id = ? AND source_type = ? AND source_id = ? LIMIT 1;`,
        [profileId, sourceType, sourceId]
      );
      return Boolean(row);
    } catch (error) {
      console.warn(
        `[WalletRepository] Error checking transaction for ${profileId}/${sourceType}/${sourceId}:`,
        error
      );
      return false;
    }
  },

  /**
   * Atomic Transaction: Insert one or more coin transactions and update the wallet balance.
   * If any transaction violates constraints (e.g. UNIQUE constraint duplicate), the entire operation rolls back.
   */
  async addTransactionWithBalanceUpdate(
    profileId: string,
    transactions: CreateCoinTransactionDTO[]
  ): Promise<number> {
    if (transactions.length === 0) {
      return this.getCoinBalance(profileId);
    }

    const db = await getDatabase();
    let netDelta = 0;

    await db.withTransactionAsync(async () => {
      const now = Date.now();

      for (const tx of transactions) {
        const id = tx.id || generateCoinTransactionId();
        const createdAt = tx.createdAt ?? now;
        const description = tx.description ?? null;

        // 1. Insert transaction into ledger
        await db.runAsync(
          `INSERT INTO ${TABLE_COIN_TRANSACTIONS} (
            id, profile_id, amount, type, source_type, source_id, description, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            id,
            profileId,
            tx.amount,
            tx.type,
            tx.sourceType,
            tx.sourceId,
            description,
            createdAt,
          ]
        );

        netDelta += tx.amount;
      }

      // 2. Upsert wallet balance
      await db.runAsync(
        `INSERT INTO ${TABLE_WALLETS} (profile_id, coin_balance, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(profile_id) DO UPDATE SET
           coin_balance = ${TABLE_WALLETS}.coin_balance + excluded.coin_balance,
           updated_at = excluded.updated_at;`,
        [profileId, netDelta, now, now]
      );
    });

    return this.getCoinBalance(profileId);
  },

  /**
   * Get all transactions for a profile ordered by most recent.
   */
  async getCoinTransactions(
    profileId: string,
    limit = 50
  ): Promise<CoinTransaction[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<CoinTransactionRow>(
        `SELECT * FROM ${TABLE_COIN_TRANSACTIONS} WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?;`,
        [profileId, limit]
      );

      return rows.map(mapRowToTransaction);
    } catch (error) {
      console.warn(`[WalletRepository] Error fetching transactions for profile "${profileId}":`, error);
      return [];
    }
  },

  /**
   * Dev helper: Reset wallet and clear transactions for a child profile.
   */
  async resetWalletForDev(profileId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `DELETE FROM ${TABLE_COIN_TRANSACTIONS} WHERE profile_id = ?;`,
          [profileId]
        );
        await db.runAsync(
          `UPDATE ${TABLE_WALLETS} SET coin_balance = 0, updated_at = ? WHERE profile_id = ?;`,
          [Date.now(), profileId]
        );
      });
    } catch (error) {
      console.warn(`[WalletRepository] Error resetting wallet for "${profileId}":`, error);
    }
  },

  /**
   * Dev helper: Set an absolute balance for a child profile (creates an adjustment transaction).
   */
  async setBalanceForDev(profileId: string, targetBalance: number): Promise<number> {
    const current = await this.getCoinBalance(profileId);
    const delta = targetBalance - current;
    if (delta === 0) return current;

    return this.addTransactionWithBalanceUpdate(profileId, [
      {
        profileId,
        amount: delta,
        type: "adjustment",
        sourceType: "dev_adjustment",
        sourceId: `dev_set_${Date.now()}`,
        description: `Manual balance adjustment to ${targetBalance}`,
      },
    ]);
  },
};
