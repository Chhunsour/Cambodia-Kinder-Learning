import { useState, useEffect, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import {
  CosmeticCategory,
  CosmeticItem,
  KokiAppearance,
  DEFAULT_APPEARANCE,
  ItemCardState,
  PurchaseResult,
} from "../types";
import { WardrobeService } from "../services/wardrobeService";
import { COSMETIC_CATALOG } from "../data/catalog";

export interface UseWardrobeReturn {
  // Data
  coinBalance: number;
  ownedItemIds: string[];
  equippedAppearance: KokiAppearance;
  previewAppearance: KokiAppearance;
  selectedCategory: CosmeticCategory;
  selectedItem: CosmeticItem | null;
  filteredItems: CosmeticItem[];
  isLoading: boolean;
  isPurchasing: boolean;

  // Actions
  setSelectedCategory: (cat: CosmeticCategory) => void;
  selectItem: (item: CosmeticItem) => void;
  equipItem: (itemId: string) => Promise<boolean>;
  unequipSlot: (slot: keyof KokiAppearance) => Promise<boolean>;
  purchaseItem: (itemId: string, autoEquip?: boolean) => Promise<PurchaseResult>;
  resetPreview: () => void;
  refresh: () => Promise<void>;
  getItemCardState: (item: CosmeticItem) => ItemCardState;
}

export function useWardrobe(): UseWardrobeReturn {
  const { profile } = useActiveProfile();
  const profileId = profile?.id;

  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([]);
  const [equippedAppearance, setEquippedAppearance] = useState<KokiAppearance>({
    ...DEFAULT_APPEARANCE,
  });
  const [previewAppearance, setPreviewAppearance] = useState<KokiAppearance>({
    ...DEFAULT_APPEARANCE,
  });
  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!profileId) {
      setCoinBalance(0);
      setOwnedItemIds([]);
      setEquippedAppearance({ ...DEFAULT_APPEARANCE });
      setPreviewAppearance({ ...DEFAULT_APPEARANCE });
      setIsLoading(false);
      return;
    }

    try {
      const state = await WardrobeService.getWardrobeState(profileId);
      setCoinBalance(state.coinBalance);
      setOwnedItemIds(state.ownedItemIds);
      setEquippedAppearance(state.equippedAppearance);
      setPreviewAppearance(state.equippedAppearance);
    } catch (err) {
      console.warn("[useWardrobe] Error loading wardrobe data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Selected item entity
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return WardrobeService.getItemById(selectedItemId) || null;
  }, [selectedItemId]);

  // Derived filtered items based on category
  const filteredItems = useMemo(() => {
    const active = COSMETIC_CATALOG.filter((i) => i.isActive);

    if (selectedCategory === "all") {
      return [...active].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (selectedCategory === "owned") {
      const ownedSet = new Set(ownedItemIds);
      return active
        .filter((item) => ownedSet.has(item.id))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return active
      .filter((item) => item.slot === selectedCategory)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedCategory, ownedItemIds]);

  // Auto-select first item in list if current selection is invalid
  useEffect(() => {
    if (filteredItems.length > 0 && (!selectedItemId || !filteredItems.some((i) => i.id === selectedItemId))) {
      setSelectedItemId(filteredItems[0].id);
      // Stage preview with this item
      const item = filteredItems[0];
      setPreviewAppearance((prev) => ({
        ...prev,
        [item.slot]: item.id,
      }));
    }
  }, [filteredItems, selectedItemId]);

  // Select an item and stage temporary preview on Koki
  const selectItem = useCallback(
    (item: CosmeticItem) => {
      setSelectedItemId(item.id);
      // Stage preview: equip this item in its slot on top of current preview
      setPreviewAppearance((prev) => ({
        ...prev,
        [item.slot]: item.id,
      }));
    },
    []
  );

  // Reset temporary preview back to real persisted equipped appearance
  const resetPreview = useCallback(() => {
    setPreviewAppearance({ ...equippedAppearance });
  }, [equippedAppearance]);

  // Equip an owned item
  const equipItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!profileId) return false;
      const item = WardrobeService.getItemById(itemId);
      if (!item) return false;

      try {
        const newAppearance = await WardrobeService.equipItem(profileId, itemId);
        setEquippedAppearance(newAppearance);
        setPreviewAppearance(newAppearance);
        return true;
      } catch (err) {
        console.warn("[useWardrobe] Failed to equip item:", err);
        return false;
      }
    },
    [profileId]
  );

  // Unequip a slot
  const unequipSlot = useCallback(
    async (slot: keyof KokiAppearance): Promise<boolean> => {
      if (!profileId) return false;
      try {
        const newAppearance = await WardrobeService.unequipSlot(profileId, slot);
        setEquippedAppearance(newAppearance);
        setPreviewAppearance(newAppearance);
        return true;
      } catch (err) {
        console.warn("[useWardrobe] Failed to unequip slot:", err);
        return false;
      }
    },
    [profileId]
  );

  // Purchase an item
  const purchaseItem = useCallback(
    async (itemId: string, autoEquip = true): Promise<PurchaseResult> => {
      if (!profileId) {
        return {
          success: false,
          item: WardrobeService.getItemById(itemId)!,
          newBalance: coinBalance,
          appearance: equippedAppearance,
          error: "No active child profile",
          errorCode: "FAILED",
        };
      }

      setIsPurchasing(true);
      try {
        const result = await WardrobeService.purchaseCosmetic({
          profileId,
          itemId,
          autoEquip,
        });

        if (result.success) {
          setCoinBalance(result.newBalance);
          setOwnedItemIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
          setEquippedAppearance(result.appearance);
          setPreviewAppearance(result.appearance);
        }

        return result;
      } catch (err: any) {
        console.warn("[useWardrobe] Purchase exception:", err);
        return {
          success: false,
          item: WardrobeService.getItemById(itemId)!,
          newBalance: coinBalance,
          appearance: equippedAppearance,
          error: err?.message || "Purchase failed",
          errorCode: "FAILED",
        };
      } finally {
        setIsPurchasing(false);
      }
    },
    [profileId, coinBalance, equippedAppearance]
  );

  // Helper to calculate card visual state
  const getItemCardState = useCallback(
    (item: CosmeticItem): ItemCardState => {
      const isEquipped = equippedAppearance[item.slot] === item.id;
      if (isEquipped) return "equipped";

      const isOwned = ownedItemIds.includes(item.id);
      if (isOwned) return "owned";

      const canAfford = coinBalance >= item.priceCoins;
      return canAfford ? "affordable" : "unaffordable";
    },
    [equippedAppearance, ownedItemIds, coinBalance]
  );

  return {
    coinBalance,
    ownedItemIds,
    equippedAppearance,
    previewAppearance,
    selectedCategory,
    selectedItem,
    filteredItems,
    isLoading,
    isPurchasing,
    setSelectedCategory,
    selectItem,
    equipItem,
    unequipSlot,
    purchaseItem,
    resetPreview,
    refresh: loadData,
    getItemCardState,
  };
}
