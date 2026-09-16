export type RewardType = "sticker" | "badge" | "koki_costume";

export interface RewardItem {
  id: string;
  type: RewardType;
  titleKm: string;
  titleEn: string;
  assetKey: string;
  isUnlocked: boolean;
  unlockedAt?: number;
}
