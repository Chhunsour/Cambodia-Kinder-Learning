import { getDatabase } from "../database";
import {
  TABLE_COSMETIC_INVENTORY,
  TABLE_KOKI_APPEARANCE,
  TABLE_WALLETS,
  TABLE_COIN_TRANSACTIONS,
} from "../database/schema";
import {
  CosmeticInventoryRow,
  KokiAppearanceRow,
} from "../database/types";
import { generateCoinTransactionId } from "./walletRepository";

export type CosmeticSlot = "head" | "face" | "neck" | "body" | "back" | "special";

export interface KokiAppearance {
  head: string | null;
  face: string | null;
  neck: string | null;
  body: string | null;
  back: string | null;
  special: string | null;
}

export const DEFAULT_APPEARANCE: KokiAppearance = {
  head: null,
  face: null,
  neck: null,
  body: null,
  back: null,
  special: null,
};

export interface ExecutePurchaseInput {
  profileId: string;
  itemId: string;
  price: number;
  slot: CosmeticSlot;
  autoEquip?: boolean;
  description?: string;
}

export interface PurchaseExecutionResult {
  success: boolean;
  newBalance: number;
  appearance: KokiAppearance;
  error?: string;
}

function mapRowToAppearance(row: KokiAppearanceRow | null): KokiAppearance {
  if (!row) return { ...DEFAULT_APPEARANCE };
  return {
    head: row.head_item_id ?? null,
    face: row.face_item_id ?? null,
    neck: row.neck_item_id ?? null,
    body: row.body_item_id ?? null,
    back: row.back_item_id ?? null,
    special: row.special_item_id ?? null,
  };
}

function getColumnForSlot(slot: CosmeticSlot): string {
  switch (slot) {
    case "head":
      return "head_item_id";
    case "face":
      return "face_item_id";
    case "neck":
      return "neck_item_id";
    case "body":
      return "body_item_id";
    case "back":
      return "back_item_id";
    case "special":
      return "special_item_id";
  }
}

/**
 * SQLite Repository for Koki Cosmetic Inventory, Equipped Appearance, and Atomic Coin Purchases.
 * Guarantees strict profile isolation and rollback safety.
 */
export const WardrobeRepository = {
  /**
   * Get all cosmetic item IDs owned by the given child profile.
   */
  async getOwnedItemIds(profileId: string): Promise<string[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ item_id: string }>(
        `SELECT item_id FROM ${TABLE_COSMETIC_INVENTORY} WHERE profile_id = ? ORDER BY acquired_at DESC;`,
        [profileId]
      );
      return rows.map((r) => r.item_id);
    } catch (error) {
      console.warn(`[WardrobeRepository] Failed to get owned items for "${profileId}":`, error);
      return [];
    }
  },

  /**
   * Check if a specific item is owned by a profile.
   */
  async isItemOwned(profileId: string, itemId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM ${TABLE_COSMETIC_INVENTORY} WHERE profile_id = ? AND item_id = ? LIMIT 1;`,
        [profileId, itemId]
      );
      return Boolean(row);
    } catch (error) {
      console.warn(`[WardrobeRepository] Failed checking ownership for ${profileId}/${itemId}:`, error);
      return false;
    }
  },

  /**
   * Get current equipped appearance for a child profile.
   */
  async getAppearance(profileId: string): Promise<KokiAppearance> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<KokiAppearanceRow>(
        `SELECT * FROM ${TABLE_KOKI_APPEARANCE} WHERE profile_id = ?;`,
        [profileId]
      );
      return mapRowToAppearance(row);
    } catch (error) {
      console.warn(`[WardrobeRepository] Failed to get appearance for "${profileId}":`, error);
      return { ...DEFAULT_APPEARANCE };
    }
  },

  /**
   * Equip or unequip an item into a specific slot for a profile.
   */
  async updateEquippedSlot(
    profileId: string,
    slot: CosmeticSlot,
    itemId: string | null
  ): Promise<KokiAppearance> {
    const db = await getDatabase();
    const now = Date.now();
    const column = getColumnForSlot(slot);

    await db.runAsync(
      `INSERT INTO ${TABLE_KOKI_APPEARANCE} (
        profile_id, head_item_id, face_item_id, neck_item_id, body_item_id, back_item_id, special_item_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        ${column} = ?,
        updated_at = ?;`,
      [
        profileId,
        slot === "head" ? itemId : null,
        slot === "face" ? itemId : null,
        slot === "neck" ? itemId : null,
        slot === "body" ? itemId : null,
        slot === "back" ? itemId : null,
        slot === "special" ? itemId : null,
        now,
        itemId,
        now,
      ]
    );

    return this.getAppearance(profileId);
  },

  /**
   * Unequip an item from a specific slot.
   */
  async unequipSlot(profileId: string, slot: CosmeticSlot): Promise<KokiAppearance> {
    return this.updateEquippedSlot(profileId, slot, null);
  },

  /**
   * Set complete appearance for a profile atomically.
   */
  async setAppearance(profileId: string, appearance: KokiAppearance): Promise<KokiAppearance> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO ${TABLE_KOKI_APPEARANCE} (
        profile_id, head_item_id, face_item_id, neck_item_id, body_item_id, back_item_id, special_item_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        head_item_id = excluded.head_item_id,
        face_item_id = excluded.face_item_id,
        neck_item_id = excluded.neck_item_id,
        body_item_id = excluded.body_item_id,
        back_item_id = excluded.back_item_id,
        special_item_id = excluded.special_item_id,
        updated_at = excluded.updated_at;`,
      [
        profileId,
        appearance.head,
        appearance.face,
        appearance.neck,
        appearance.body,
        appearance.back,
        appearance.special,
        now,
      ]
    );
    return appearance;
  },

  /**
   * Batch insert cosmetic items into inventory (used by sync pull merge).
   */
  async batchAddCosmetics(
    profileId: string,
    items: Array<{ itemId: string; acquiredAt?: number; source?: string }>
  ): Promise<void> {
    if (items.length === 0) return;
    const db = await getDatabase();
    const now = Date.now();
    await db.withTransactionAsync(async () => {
      for (const item of items) {
        const id = `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          `INSERT OR IGNORE INTO ${TABLE_COSMETIC_INVENTORY} (id, profile_id, item_id, acquired_at, source)
           VALUES (?, ?, ?, ?, ?);`,
          [id, profileId, item.itemId, item.acquiredAt ?? now, item.source ?? "sync"]
        );
      }
    });
  },

  /**
   * Atomically executes a cosmetic purchase:
   * 1. Validates current wallet balance >= price.
   * 2. Validates item is not already owned.
   * 3. Records spend transaction in coin ledger.
   * 4. Deducts coins from wallet.
   * 5. Adds item to cosmetic_inventory.
   * 6. Optionally auto-equips the item.
   * Rollback occurs automatically if any assertion or query fails.
   */
  async executePurchaseTransaction(
    input: ExecutePurchaseInput
  ): Promise<PurchaseExecutionResult> {
    const { profileId, itemId, price, slot, autoEquip = true, description } = input;
    const db = await getDatabase();

    let finalBalance = 0;
    let finalAppearance: KokiAppearance = { ...DEFAULT_APPEARANCE };

    try {
      await db.withTransactionAsync(async () => {
        const now = Date.now();

        // 1. Check current wallet balance
        const walletRow = await db.getFirstAsync<{ coin_balance: number }>(
          `SELECT coin_balance FROM ${TABLE_WALLETS} WHERE profile_id = ?;`,
          [profileId]
        );
        const currentBalance = walletRow?.coin_balance ?? 0;

        if (currentBalance < price) {
          throw new Error(`INSUFFICIENT_COINS: Required ${price}, available ${currentBalance}`);
        }

        // 2. Check if already owned
        const existingItem = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM ${TABLE_COSMETIC_INVENTORY} WHERE profile_id = ? AND item_id = ?;`,
          [profileId, itemId]
        );

        if (existingItem) {
          throw new Error(`ALREADY_OWNED: Profile "${profileId}" already owns "${itemId}"`);
        }

        // 3. Insert spend coin transaction into ledger
        const txId = generateCoinTransactionId();
        await db.runAsync(
          `INSERT INTO ${TABLE_COIN_TRANSACTIONS} (
            id, profile_id, amount, type, source_type, source_id, description, created_at
          ) VALUES (?, ?, ?, 'spend', 'cosmetic_purchase', ?, ?, ?);`,
          [
            txId,
            profileId,
            -price,
            itemId,
            description || `Bought ${itemId}`,
            now,
          ]
        );

        // 4. Deduct coins from wallet balance
        await db.runAsync(
          `UPDATE ${TABLE_WALLETS} SET coin_balance = coin_balance - ?, updated_at = ? WHERE profile_id = ?;`,
          [price, now, profileId]
        );
        finalBalance = currentBalance - price;

        // 5. Grant item in cosmetic_inventory
        const invId = `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          `INSERT INTO ${TABLE_COSMETIC_INVENTORY} (
            id, profile_id, item_id, acquired_at, source
          ) VALUES (?, ?, ?, ?, 'purchase');`,
          [invId, profileId, itemId, now]
        );

        // 6. Auto-equip newly purchased item if requested
        if (autoEquip) {
          const column = getColumnForSlot(slot);
          await db.runAsync(
            `INSERT INTO ${TABLE_KOKI_APPEARANCE} (
              profile_id, head_item_id, face_item_id, neck_item_id, body_item_id, back_item_id, special_item_id, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(profile_id) DO UPDATE SET
              ${column} = ?,
              updated_at = ?;`,
            [
              profileId,
              slot === "head" ? itemId : null,
              slot === "face" ? itemId : null,
              slot === "neck" ? itemId : null,
              slot === "body" ? itemId : null,
              slot === "back" ? itemId : null,
              slot === "special" ? itemId : null,
              now,
              itemId,
              now,
            ]
          );
        }
      });

      finalAppearance = await this.getAppearance(profileId);

      return {
        success: true,
        newBalance: finalBalance,
        appearance: finalAppearance,
      };
    } catch (err: any) {
      console.warn(`[WardrobeRepository] Purchase failed for ${profileId}/${itemId}:`, err?.message || err);
      const balanceRow = await db.getFirstAsync<{ coin_balance: number }>(
        `SELECT coin_balance FROM ${TABLE_WALLETS} WHERE profile_id = ?;`,
        [profileId]
      );
      const appearance = await this.getAppearance(profileId);
      return {
        success: false,
        newBalance: balanceRow?.coin_balance ?? 0,
        appearance,
        error: err?.message || "Purchase failed",
      };
    }
  },

  /**
   * Dev helper: Reset wardrobe (clear inventory and appearance) for testing.
   */
  async resetWardrobeForDev(profileId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM ${TABLE_COSMETIC_INVENTORY} WHERE profile_id = ?;`, [profileId]);
        await db.runAsync(`DELETE FROM ${TABLE_KOKI_APPEARANCE} WHERE profile_id = ?;`, [profileId]);
      });
    } catch (error) {
      console.warn(`[WardrobeRepository] Error resetting wardrobe for "${profileId}":`, error);
    }
  },

  /**
   * Dev helper: Grant list of cosmetics for testing.
   */
  async grantCosmeticsForDev(profileId: string, itemIds: string[]): Promise<void> {
    try {
      const db = await getDatabase();
      const now = Date.now();
      await db.withTransactionAsync(async () => {
        for (const itemId of itemIds) {
          const invId = `dev_inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          await db.runAsync(
            `INSERT OR IGNORE INTO ${TABLE_COSMETIC_INVENTORY} (id, profile_id, item_id, acquired_at, source)
             VALUES (?, ?, ?, ?, 'default');`,
            [invId, profileId, itemId, now]
          );
        }
      });
    } catch (error) {
      console.warn(`[WardrobeRepository] Error granting dev cosmetics for "${profileId}":`, error);
    }
  },
};
