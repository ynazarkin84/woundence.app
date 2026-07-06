/**
 * Central typography scale for the mobile app. Font family/size don't
 * change with color scheme, so — unlike colors — these are plain constants,
 * not a hook. Combine with a color token for the final text style, e.g.:
 *   <Text style={[typography.h2, { color: colors.foreground }]}>
 */

const typography = {
  display: { fontSize: 28, fontFamily: "Inter_700Bold" },
  h1: { fontSize: 22, fontFamily: "Inter_700Bold" },
  h2: { fontSize: 18, fontFamily: "Inter_700Bold" },
  h3: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 15, fontFamily: "Inter_400Regular" },
  bodyMedium: { fontSize: 15, fontFamily: "Inter_500Medium" },
  bodySemibold: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  caption: { fontSize: 13, fontFamily: "Inter_400Regular" },
  captionSemibold: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
} as const;

export default typography;
