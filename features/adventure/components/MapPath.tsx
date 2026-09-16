import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { BranchConnection } from "../utils/mapGeometry";

interface MapPathProps {
  width: number;
  height: number;
  mainPoints: { x: number; y: number }[];
  branchConnections: BranchConnection[];
}

/**
 * Builds a smooth cubic Bezier path string through an array of points.
 */
function buildSmoothPathD(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dy = p1.y - p0.y;

    // Cubic Bezier curve vertically pulling between points
    const cp1x = p0.x;
    const cp1y = p0.y + dy * 0.5;
    const cp2x = p1.x;
    const cp2y = p1.y - dy * 0.5;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  return d;
}

/**
 * Builds a curved branch connecting line from main path to side quest.
 */
function buildBranchPathD(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const cp1x = from.x + dx * 0.5;
  const cp1y = from.y;
  const cp2x = to.x;
  const cp2y = to.y - dy * 0.2;

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
}

export const MapPath: React.FC<MapPathProps> = React.memo(({
  width,
  height,
  mainPoints,
  branchConnections,
}) => {
  if (mainPoints.length < 2) {
    return null;
  }

  const mainPathD = buildSmoothPathD(mainPoints);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Branch Shadows */}
        {branchConnections.map((b, idx) => (
          <Path
            key={`branch-shadow-${idx}`}
            d={buildBranchPathD(b.from, b.to)}
            stroke="#BAE6FD"
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* Branch Foreground (Sky-Blue Stepping Stones) */}
        {branchConnections.map((b, idx) => (
          <Path
            key={`branch-fg-${idx}`}
            d={buildBranchPathD(b.from, b.to)}
            stroke="#0284C7"
            strokeWidth={5}
            strokeDasharray="6, 8"
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* Main Path: Soft-3D Rim/Shadow */}
        <Path
          d={mainPathD}
          stroke="#D1CABE"
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Main Path: Cobblestone Dirt Road */}
        <Path
          d={mainPathD}
          stroke="#F5EBD7"
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Main Path: Stepping Stones Inlay */}
        <Path
          d={mainPathD}
          stroke="#E0D2BC"
          strokeWidth={4}
          strokeDasharray="6, 12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
});

MapPath.displayName = "MapPath";
