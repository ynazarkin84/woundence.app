/**
 * Central design tokens for the mobile app — teal/cobalt gradient brand
 * system. This is the single source of truth for color; screens should
 * never hardcode a hex value, they should read from useColors().
 */

const colors = {
  light: {
    // Core surfaces
    background: "#F0F8FB", // background-tint — never pure white
    foreground: "#0B3D91", // text-heading — dark navy

    // Cards / elevated surfaces (white only, shadow applied by <Card>, no border)
    card: "#FFFFFF", // surface-white
    cardForeground: "#0B3D91",

    // Primary action color (buttons, headers, callout blocks)
    primary: "#0B3D91", // primary-navy
    primaryForeground: "#FFFFFF",

    // Secondary / lighter brand accent (teal end of the gradient)
    secondary: "#4FC3C3",
    secondaryForeground: "#0B3D91",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#E3EEF3",
    mutedForeground: "#5A7185", // text-body — soft gray-blue

    // Accent highlights (inactive pills, selected-but-not-active surfaces)
    accent: "#DCEEF3",
    accentForeground: "#0B3D91",

    // Destructive actions (delete, error states) — distinct from
    // status-concern below, which is for clinical wound status, not actions.
    destructive: "#E15353",
    destructiveForeground: "#FFFFFF",

    // Borders and input outlines — light teal-tinted stroke
    border: "#B8DDE0",
    input: "#CFE3E7",

    // Brand gradient (teal -> deep cobalt blue). Pass `gradient` directly to
    // <LinearGradient colors={colors.gradient}>.
    gradientStart: "#4FC3C3",
    gradientEnd: "#1E4FD6",
    gradient: ["#4FC3C3", "#1E4FD6"] as [string, string],

    // Clinical status colors — muted, not alarm colors.
    statusGood: "#4E9C93",
    statusGoodForeground: "#FFFFFF",
    statusWatch: "#B98A3A",
    statusWatchForeground: "#FFFFFF",
    statusConcern: "#C97873",
    statusConcernForeground: "#FFFFFF",
  },

  // Border radius scale (in px), synced from the web artifact's --radius token.
  radius: {
    sm: 10,
    md: 16,
    lg: 20, // cards
    pill: 999, // buttons, tags, nav bar
  },
};

export default colors;
