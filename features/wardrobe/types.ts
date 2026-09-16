import {
  CosmeticSlot,
  KokiAppearance,
  DEFAULT_APPEARANCE,
} from "../../storage/repositories/wardrobeRepository";

export type { CosmeticSlot, KokiAppearance };
export { DEFAULT_APPEARANCE };

export type CosmeticCategory =
  | "all"
  | "head"
  | "face"
  | "neck"
  | "body"
  | "back"
  | "special"
  | "owned";

export type CosmeticRarity = "common" | "rare" | "special";

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  nameKey: string;
  descKey: string;
  nameEn: string;
  nameKm: string;
  icon: string;
  priceCoins: number;
  rarity: CosmeticRarity;
  sortOrder: number;
  isActive: boolean;
}

export type ItemCardState = "locked" | "affordable" | "unaffordable" | "owned" | "equipped";

export interface WardrobeState {
  coinBalance: number;
  ownedItemIds: string[];
  equippedAppearance: KokiAppearance;
  items: CosmeticItem[];
}

export interface PurchaseResult {
  success: boolean;
  item: CosmeticItem;
  newBalance: number;
  appearance: KokiAppearance;
  error?: string;
  errorCode?: "INSUFFICIENT_COINS" | "ALREADY_OWNED" | "INACTIVE_ITEM" | "ITEM_NOT_FOUND" | "FAILED";
}
