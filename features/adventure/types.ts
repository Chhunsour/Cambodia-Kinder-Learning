export type IslandTheme =
  | "angkor_jungle"
  | "tonle_sap_river"
  | "cardamom_mountain"
  | "sunflower_valley"
  | "koki_village"
  | "english_sky";

export type MapNodeType = "lesson" | "treasure" | "challenge" | "sideQuest";

export type MapNodeStatus = "completed" | "current" | "unlocked" | "locked";

export interface MapNodeData {
  id: string;
  type: MapNodeType;
  status: MapNodeStatus;
  levelNumber?: number;
  stars: number; // 0 to 3
  titleKm: string;
  titleEn: string;
  lessonId?: string;
  descriptionKm?: string;
  descriptionEn?: string;
  sideQuestTopic?: string;
  branchSide?: "left" | "right";
}

export interface WorldDefinition {
  id: string;
  worldNumber: number;
  nameKm: string;
  nameEn: string;
  theme: IslandTheme;
  totalLessons: number;
  completedLessons: number;
  totalStarsEarned: number;
  totalStarsPossible: number;
  nodes: MapNodeData[];
}

export interface NodeLayoutPosition {
  node: MapNodeData;
  x: number; // Center X
  y: number; // Center Y
  isBranch?: boolean;
  branchSide?: "left" | "right";
  parentIndex?: number;
}

