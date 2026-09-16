import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export interface MatchingLineConnection {
  pairId: string;
  leftPoint: { x: number; y: number };
  rightPoint: { x: number; y: number };
  color: string;
}

interface MatchingConnectionLinesProps {
  width: number;
  height: number;
  connections: MatchingLineConnection[];
}

export const MatchingConnectionLines: React.FC<MatchingConnectionLinesProps> = React.memo(({
  width,
  height,
  connections,
}) => {
  if (connections.length === 0 || width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height }]}>
      <Svg width={width} height={height}>
        {connections.map((conn) => {
          const { leftPoint, rightPoint, color, pairId } = conn;
          const dx = rightPoint.x - leftPoint.x;
          const cp1x = leftPoint.x + dx * 0.45;
          const cp1y = leftPoint.y;
          const cp2x = rightPoint.x - dx * 0.45;
          const cp2y = rightPoint.y;

          const pathD = `M ${leftPoint.x} ${leftPoint.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${rightPoint.x} ${rightPoint.y}`;

          return (
            <React.Fragment key={`line-${pairId}`}>
              {/* Shadow / Glow Line */}
              <Path
                d={pathD}
                stroke={color}
                strokeWidth={7}
                strokeOpacity={0.25}
                strokeLinecap="round"
                fill="none"
              />
              {/* Foreground Dashed Connection Line */}
              <Path
                d={pathD}
                stroke={color}
                strokeWidth={3.5}
                strokeDasharray="6, 6"
                strokeLinecap="round"
                fill="none"
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
});

MatchingConnectionLines.displayName = "MatchingConnectionLines";
