/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#e2e8f0',
    tint: '#2d8cff',

    // Core surfaces
    background: '#080f1b',
    foreground: '#e2e8f0',

    // Cards / elevated surfaces
    card: '#0e1727',
    cardForeground: '#e2e8f0',

    // Primary action color (buttons, links, active states)
    primary: '#1677d2',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#152236',
    secondaryForeground: '#cbd5e1',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#152236',
    mutedForeground: '#94a3b8',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#17345b',
    accentForeground: '#bfdbfe',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#23334a',
    input: '#23334a',
  },

  dark: {
    text: '#e2e8f0',
    tint: '#2d8cff',
    background: '#080f1b',
    foreground: '#e2e8f0',
    card: '#0e1727',
    cardForeground: '#e2e8f0',
    primary: '#1677d2',
    primaryForeground: '#ffffff',
    secondary: '#152236',
    secondaryForeground: '#cbd5e1',
    muted: '#152236',
    mutedForeground: '#94a3b8',
    accent: '#17345b',
    accentForeground: '#bfdbfe',
    destructive: '#f87171',
    destructiveForeground: '#ffffff',
    border: '#23334a',
    input: '#23334a',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
