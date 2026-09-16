import { MapNodeData, NodeLayoutPosition } from "../types";

export interface BranchConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  status: "unlocked" | "locked" | "completed";
}

export interface MapLayoutResult {
  positionedNodes: NodeLayoutPosition[];
  mainPathPoints: { x: number; y: number }[];
  branchConnections: BranchConnection[];
  totalHeight: number;
  currentLevelPosition?: NodeLayoutPosition;
}

/**
 * Normalizes a winding sequence pattern of relative lateral offsets (-1.0 to 1.0).
 */
const WINDING_OFFSETS = [
  0.25,   // node 0
  -0.35,  // node 1
  -0.70,  // node 2
  -0.20,  // node 3
  0.30,   // node 4
  0.75,   // node 5
  0.40,   // node 6
  -0.25,  // node 7
  -0.75,  // node 8
  -0.35,  // node 9
  0.20,   // node 10
  0.70,   // node 11
  0.35,   // node 12
  -0.30,  // node 13
];

/**
 * Calculates responsive (x, y) coordinates for all map nodes,
 * connecting Bezier spline paths, and side branches.
 */
export function calculateMapLayout(
  nodes: MapNodeData[],
  contentWidth: number,
  options?: {
    yStart?: number;
    spacing?: number;
  }
): MapLayoutResult {
  const yStart = options?.yStart ?? 40;
  const spacing = options?.spacing ?? 115;
  const centerX = contentWidth / 2;
  const maxSwing = Math.min(contentWidth * 0.32, 115);

  const positionedNodes: NodeLayoutPosition[] = [];
  const mainPathPoints: { x: number; y: number }[] = [];
  const branchConnections: BranchConnection[] = [];

  let currentY = yStart;
  let mainIndex = 0;
  let lastMainPos: { x: number; y: number } | null = null;
  let currentLevelPosition: NodeLayoutPosition | undefined;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isBranch = node.type === "sideQuest";

    if (isBranch) {
      // Side quests branch off laterally from the preceding main node
      const parentPos = lastMainPos ?? { x: centerX, y: currentY - spacing };
      const branchSide = node.branchSide ?? (parentPos.x >= centerX ? "left" : "right");
      
      const branchOffset = branchSide === "left" ? -115 : 115;
      const rawX = parentPos.x + branchOffset;
      // Clamp within safe margins
      const clampedX = Math.max(48, Math.min(contentWidth - 48, rawX));
      const branchY = parentPos.y + spacing * 0.45;

      const pos: NodeLayoutPosition = {
        node,
        x: clampedX,
        y: branchY,
        isBranch: true,
        branchSide,
        parentIndex: mainIndex - 1,
      };

      positionedNodes.push(pos);
      branchConnections.push({
        from: { x: parentPos.x, y: parentPos.y },
        to: { x: clampedX, y: branchY },
        status: node.status === "locked" ? "locked" : "unlocked",
      });

      if (node.status === "current") {
        currentLevelPosition = pos;
      }
      // Note: Do not advance currentY or mainIndex for side branch
      continue;
    }

    // Main path node: winds smoothly left and right
    const offsetFactor = WINDING_OFFSETS[mainIndex % WINDING_OFFSETS.length];
    const x = Math.round(centerX + offsetFactor * maxSwing);
    const y = currentY;

    const pos: NodeLayoutPosition = {
      node,
      x,
      y,
      isBranch: false,
    };

    positionedNodes.push(pos);
    mainPathPoints.push({ x, y });

    if (node.status === "current") {
      currentLevelPosition = pos;
    }

    lastMainPos = { x, y };
    currentY += spacing;
    mainIndex++;
  }

  const totalHeight = currentY + 60; // trailing buffer for bottom tab bar clearance

  return {
    positionedNodes,
    mainPathPoints,
    branchConnections,
    totalHeight,
    currentLevelPosition,
  };
}
