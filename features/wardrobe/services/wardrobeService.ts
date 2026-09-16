import {
  WardrobeRepository,
  CosmeticSlot,
  KokiAppearance,
  DEFAULT_APPEARANCE,
} from "../../../storage/repositories/wardrobeRepository";
import { WalletRepository } from "../../../storage/repositories/walletRepository";
import {
  CosmeticCategory,
  CosmeticItem,
  WardrobeState,
  PurchaseResult,
} from "../types";
import { COSMETIC_CATALOG, COSMETIC_CATALOG_MAP } from "../data/catalog";
import { SyncService } from "@/features/parent/services/syncService";

export const WardrobeService = {
  /**
   * Returns active catalog items filtered by category.
   * "all" returns all active items.
   * "owned" is resolved dynamically in `getFilteredItems`.
   */
  getCatalogItems(category: CosmeticCategory = "all"): CosmeticItem[] {
    const active = COSMETIC_CATALOG.filter((i) => i.isActive);
    if (category === "all" || category === "owned") {
      return [...active].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return active
      .filter((item) => item.slot === category)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * Look up an item by its ID.
   */
  getItemById(itemId: string): CosmeticItem | undefined {
    return COSMETIC_CATALOG_MAP[itemId];
  },

  /**
   * Check whether a specific item ID is currently equipped in its slot.
   */
  isItemEquipped(appearance: KokiAppearance, itemId: string): boolean {
    const item = this.getItemById(itemId);
    if (!item) return false;
    return appearance[item.slot] === itemId;
  },

  /**
   * Fetch complete wardrobe state for a child profile.
   */
  async getWardrobeState(profileId: string): Promise<WardrobeState> {
    const [coinBalance, ownedItemIds, equippedAppearance] = await Promise.all([
      WalletRepository.getCoinBalance(profileId),
      WardrobeRepository.getOwnedItemIds(profileId),
      WardrobeRepository.getAppearance(profileId),
    ]);

    return {
      coinBalance,
      ownedItemIds,
      equippedAppearance,
      items: this.getCatalogItems("all"),
    };
  },

  /**
   * Equip an owned cosmetic item.
   */
  async equipItem(profileId: string, itemId: string): Promise<KokiAppearance> {
    const item = this.getItemById(itemId);
    if (!item) {
      console.warn(`[WardrobeService] Cannot equip unknown item: "${itemId}"`);
      return WardrobeRepository.getAppearance(profileId);
    }

    const isOwned = await WardrobeRepository.isItemOwned(profileId, itemId);
    if (!isOwned) {
      console.warn(`[WardrobeService] Cannot equip unowned item "${itemId}" for profile "${profileId}"`);
      return WardrobeRepository.getAppearance(profileId);
    }

    const updated = await WardrobeRepository.updateEquippedSlot(profileId, item.slot, itemId);
    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "equipped_cosmetics",
      entityId: profileId,
      operation: "upsert",
      payload: updated,
    }).catch(() => {});
    return updated;
  },

  /**
   * Unequip whatever item is currently in the specified slot.
   */
  async unequipSlot(profileId: string, slot: CosmeticSlot): Promise<KokiAppearance> {
    const updated = await WardrobeRepository.unequipSlot(profileId, slot);
    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "equipped_cosmetics",
      entityId: profileId,
      operation: "upsert",
      payload: updated,
    }).catch(() => {});
    return updated;
  },

  /**
   * Atomically purchase a cosmetic item with earned learning coins:
   * 1. Validates item existence and active status.
   * 2. Checks profile doesn't already own it.
   * 3. Checks wallet has sufficient coins.
   * 4. Deducts coins, records spend transaction, adds to inventory, and optionally auto-equips.
   */
  async purchaseCosmetic({
    profileId,
    itemId,
    autoEquip = true,
  }: {
    profileId: string;
    itemId: string;
    autoEquip?: boolean;
  }): Promise<PurchaseResult> {
    const item = this.getItemById(itemId);
    if (!item) {
      const balance = await WalletRepository.getCoinBalance(profileId);
      const appearance = await WardrobeRepository.getAppearance(profileId);
      return {
        success: false,
        item: {
          id: itemId,
          slot: "head",
          nameKey: "",
          descKey: "",
          nameEn: "Unknown",
          nameKm: "មិនស្គាល់",
          icon: "❓",
          priceCoins: 0,
          rarity: "common",
          sortOrder: 0,
          isActive: false,
        },
        newBalance: balance,
        appearance,
        error: "Item not found in catalog",
        errorCode: "ITEM_NOT_FOUND",
      };
    }

    if (!item.isActive) {
      const balance = await WalletRepository.getCoinBalance(profileId);
      const appearance = await WardrobeRepository.getAppearance(profileId);
      return {
        success: false,
        item,
        newBalance: balance,
        appearance,
        error: "Item is not currently available",
        errorCode: "INACTIVE_ITEM",
      };
    }

    // Check ownership before opening database transaction
    const alreadyOwned = await WardrobeRepository.isItemOwned(profileId, itemId);
    if (alreadyOwned) {
      const balance = await WalletRepository.getCoinBalance(profileId);
      const appearance = await WardrobeRepository.getAppearance(profileId);
      return {
        success: false,
        item,
        newBalance: balance,
        appearance,
        error: "Item is already owned",
        errorCode: "ALREADY_OWNED",
      };
    }

    // Check balance before opening database transaction
    const balance = await WalletRepository.getCoinBalance(profileId);
    if (balance < item.priceCoins) {
      const appearance = await WardrobeRepository.getAppearance(profileId);
      return {
        success: false,
        item,
        newBalance: balance,
        appearance,
        error: `Insufficient coins. Need ${item.priceCoins}, have ${balance}`,
        errorCode: "INSUFFICIENT_COINS",
      };
    }

    // Execute atomic purchase transaction in SQLite
    const txResult = await WardrobeRepository.executePurchaseTransaction({
      profileId,
      itemId,
      price: item.priceCoins,
      slot: item.slot,
      autoEquip,
      description: `Purchased ${item.nameEn}`,
    });

    if (!txResult.success) {
      return {
        success: false,
        item,
        newBalance: txResult.newBalance,
        appearance: txResult.appearance,
        error: txResult.error || "Purchase transaction failed",
        errorCode: "FAILED",
      };
    }

    // Enqueue background sync mutations if bound
    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "cosmetic_inventory",
      entityId: itemId,
      operation: "upsert",
      payload: { itemId },
    }).catch(() => {});

    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "wallet",
      entityId: profileId,
      operation: "upsert",
      payload: { coin_balance: txResult.newBalance },
    }).catch(() => {});

    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "equipped_cosmetics",
      entityId: profileId,
      operation: "upsert",
      payload: txResult.appearance,
    }).catch(() => {});

    return {
      success: true,
      item,
      newBalance: txResult.newBalance,
      appearance: txResult.appearance,
    };
  },

  /**
   * Dev helper: Reset wardrobe for testing.
   */
  async resetWardrobeForDev(profileId: string): Promise<void> {
    return WardrobeRepository.resetWardrobeForDev(profileId);
  },

  /**
   * Dev helper: Grant all catalog items for testing.
   */
  async grantAllCosmeticsForDev(profileId: string): Promise<void> {
    const allIds = COSMETIC_CATALOG.map((i) => i.id);
    return WardrobeRepository.grantCosmeticsForDev(profileId, allIds);
  },
};
