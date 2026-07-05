/**
 * Semantic design tokens for the mobile app.
 *
 * Mirrors the Woundence web app's theme (artifacts/woundence/src/index.css)
 * so the mobile companion shares the exact same teal/blue brand palette.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#062647",
    tint: "#1193d4",

    // Core surfaces
    background: "#f8fafc",
    foreground: "#062647",

    // Cards / elevated surfaces
    card: "#ffffff",
    cardForeground: "#062647",

    // Primary action color (buttons, links, active states)
    primary: "#1193d4",
    primaryForeground: "#f8fafc",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#63c7e9",
    secondaryForeground: "#062647",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#eef4f6",
    mutedForeground: "#60809f",

    // Accent highlights (badges, selected items, focus rings)
    accent: "#c2e8f0",
    accentForeground: "#062647",

    // Destructive actions (delete, error states)
    destructive: "#ef4343",
    destructiveForeground: "#f8fafc",

    // Borders and input outlines
    border: "#d7e5ea",
    input: "#dee9ed",
  },

  // Border radius (in px), synced from the web artifact's --radius token.
  radius: 12,
};

export default colors;
