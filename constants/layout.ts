/**
 * Koki Layout & Responsive Constants
 * Supporting phones and tablets in portrait and landscape orientations.
 */
export const Layout = {
  breakpoints: {
    phoneMaxWidth: 600,
    tabletMinWidth: 768,
    largeTabletMinWidth: 1024,
  },
  containers: {
    maxContentWidth: 720,
    maxCardWidth: 540,
    maxGameCanvasWidth: 840,
  },
  game: {
    aspectRatio: 16 / 9,
    tabletAspectRatio: 4 / 3,
  },
  elevation: {
    card: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    button3D: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 10,
      elevation: 5,
    },
  },
} as const;
