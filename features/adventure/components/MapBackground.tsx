import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { Palette } from "@/constants/theme";

interface MapBackgroundProps {
  width: number;
  height: number;
}

/**
 * Renders a stylized Cambodian sugar palm tree (ដើមត្នោត / Thnot).
 */
const SugarPalm = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    {/* Slender curved trunk */}
    <Path
      d="M 18 60 Q 22 30 20 12 Q 23 30 22 60 Z"
      fill="#8C6747"
    />
    {/* Palm fronds radiating */}
    <Path d="M 20 14 C 10 8, 4 14, 0 20 C 8 16, 14 16, 20 14" fill="#3D8B37" />
    <Path d="M 20 14 C 12 4, 16 -2, 18 -8 C 20 0, 20 8, 20 14" fill="#4DA846" />
    <Path d="M 20 14 C 24 2, 28 -4, 34 -6 C 30 2, 26 8, 20 14" fill="#3D8B37" />
    <Path d="M 20 14 C 28 8, 36 12, 42 16 C 34 16, 26 15, 20 14" fill="#4DA846" />
    <Path d="M 20 14 C 14 20, 10 24, 6 30 C 12 24, 16 20, 20 14" fill="#2E6B29" />
    <Path d="M 20 14 C 26 20, 30 24, 36 28 C 30 22, 24 18, 20 14" fill="#2E6B29" />
    {/* Fruit cluster */}
    <Circle cx="18" cy="16" r="3" fill="#4A3B2C" />
    <Circle cx="22" cy="17" r="2.5" fill="#4A3B2C" />
    <Circle cx="20" cy="19" r="2.5" fill="#382C22" />
  </G>
);

/**
 * Stylized round village tree.
 */
const VillageTree = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    {/* Trunk */}
    <Rect x="16" y="26" width="6" height="18" rx="2" fill="#9C6B3C" />
    {/* Foliage layers */}
    <Circle cx="19" cy="22" r="15" fill="#439336" />
    <Circle cx="13" cy="16" r="12" fill="#58B947" />
    <Circle cx="25" cy="17" r="11" fill="#58B947" />
    <Circle cx="19" cy="12" r="11" fill="#71D15E" />
  </G>
);

/**
 * Stylized Cambodian stilt cottage / village hut.
 */
const VillageCottage = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    {/* Stilts */}
    <Rect x="4" y="26" width="3" height="14" fill="#8C6747" rx="1" />
    <Rect x="18" y="26" width="3" height="14" fill="#8C6747" rx="1" />
    <Rect x="31" y="26" width="3" height="14" fill="#8C6747" rx="1" />
    {/* House Body */}
    <Rect x="3" y="14" width="32" height="14" fill="#C49A6C" rx="2" />
    <Rect x="13" y="17" width="6" height="9" fill="#6A4927" rx="1" />
    <Rect x="23" y="17" width="6" height="6" fill="#F0F9FF" rx="1" />
    {/* Thatched curved roof */}
    <Path d="M 0 15 L 19 2 L 38 15 Z" fill="#D97706" />
    <Path d="M 3 14 L 19 3 L 35 14 Z" fill="#F59E0B" />
  </G>
);

/**
 * Cute blossom flower.
 */
const Flower = ({ x, y, color = "#FF4D4D" }: { x: number; y: number; color?: string }) => (
  <G transform={`translate(${x}, ${y})`}>
    <Circle cx="6" cy="2" r="3" fill={color} opacity={0.85} />
    <Circle cx="10" cy="6" r="3" fill={color} opacity={0.85} />
    <Circle cx="6" cy="10" r="3" fill={color} opacity={0.85} />
    <Circle cx="2" cy="6" r="3" fill={color} opacity={0.85} />
    <Circle cx="6" cy="6" r="2.5" fill="#FFC83D" />
  </G>
);

/**
 * Soft cartoon cloud.
 */
const Cloud = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`} opacity={0.85}>
    <Circle cx="14" cy="16" r="10" fill="#FFFFFF" />
    <Circle cx="26" cy="12" r="12" fill="#FFFFFF" />
    <Circle cx="38" cy="16" r="9" fill="#FFFFFF" />
    <Rect x="14" y="16" width="24" height="10" fill="#FFFFFF" rx="4" />
  </G>
);

/**
 * Grass tuft.
 */
const GrassTuft = ({ x, y }: { x: number; y: number }) => (
  <G transform={`translate(${x}, ${y})`}>
    <Path d="M 2 8 Q 0 2 -2 0 Q 1 4 4 8" fill="#71D15E" />
    <Path d="M 5 8 Q 6 1 7 -2 Q 7 3 6 8" fill="#58B947" />
    <Path d="M 7 8 Q 9 3 12 2 Q 9 5 8 8" fill="#439336" />
  </G>
);

export const MapBackground: React.FC<MapBackgroundProps> = React.memo(({ width, height }) => {
  // Generate procedural countryside scenery repeating gracefully down the canvas
  const steps = Math.max(4, Math.floor(height / 280));
  const decorItems: React.ReactNode[] = [];

  for (let i = 0; i < steps; i++) {
    const baseY = i * 280 + 80;
    const isEven = i % 2 === 0;

    // Left margin scenery
    if (isEven) {
      decorItems.push(
        <SugarPalm key={`palm-l-${i}`} x={12} y={baseY} scale={0.9} />,
        <GrassTuft key={`grass-l-${i}`} x={36} y={baseY + 54} />,
        <Flower key={`flower-l-${i}`} x={20} y={baseY + 80} color={Palette.friendlyRed} />
      );
    } else {
      decorItems.push(
        <VillageCottage key={`hut-l-${i}`} x={10} y={baseY + 20} scale={0.85} />,
        <GrassTuft key={`grass-l2-${i}`} x={42} y={baseY + 60} />
      );
    }

    // Right margin scenery
    if (!isEven) {
      decorItems.push(
        <SugarPalm key={`palm-r-${i}`} x={width - 48} y={baseY + 30} scale={0.85} />,
        <Flower key={`flower-r-${i}`} x={width - 32} y={baseY + 110} color="#8B5CF6" />,
        <GrassTuft key={`grass-r-${i}`} x={width - 40} y={baseY + 90} />
      );
    } else {
      decorItems.push(
        <VillageTree key={`tree-r-${i}`} x={width - 50} y={baseY + 40} scale={0.9} />,
        <GrassTuft key={`grass-r2-${i}`} x={width - 30} y={baseY + 80} />,
        <Flower key={`flower-r2-${i}`} x={width - 45} y={baseY + 120} color={Palette.gold} />
      );
    }
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          {/* Soft background sky-to-earth gradient */}
          <LinearGradient id="bgGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#E2F4FF" />
            <Stop offset="12%" stopColor="#FFF7EA" />
            <Stop offset="100%" stopColor="#FFF4E0" />
          </LinearGradient>
        </Defs>

        {/* Base Background Fill */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#bgGradient)" />

        {/* Top Sky Clouds */}
        <Cloud x={24} y={30} scale={0.9} />
        <Cloud x={width - 90} y={50} scale={0.75} />
        <Cloud x={width / 2 - 30} y={15} scale={0.65} />

        {/* Rolling Background Countryside Hills at Header */}
        <Path
          d={`M 0 100 Q ${width * 0.25} 70 ${width * 0.5} 90 T ${width} 80 L ${width} 0 L 0 0 Z`}
          fill="#DDF3D8"
          opacity={0.7}
        />
        <Path
          d={`M 0 120 Q ${width * 0.3} 100 ${width * 0.65} 115 T ${width} 105 L ${width} 0 L 0 0 Z`}
          fill="#CCECC5"
          opacity={0.8}
        />

        {/* Decorative Nature Props */}
        {decorItems}
      </Svg>
    </View>
  );
});

MapBackground.displayName = "MapBackground";
