import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#ffffff",
    textSecondary: "#9ca3af",
    textTertiary: "#6b7280",
    textDisabled: "#4b5563",
    buttonText: "#ffffff",
    tabIconDefault: "#6b7280",
    tabIconSelected: "#c4a67c",
    link: "#c4a67c",
    backgroundRoot: "#1a1d21",
    backgroundDefault: "#24282e",
    backgroundSecondary: "#2f343b",
    backgroundTertiary: "#3a4049",
    accent: "#c4a67c",
    accentSecondary: "#4f46e5",
    accentGradientStart: "#4f46e5",
    accentGradientEnd: "#818cf8",
    border: "rgba(255,255,255,0.1)",
    emotions: {
      anxiety: "#f59e0b",
      anger: "#ef4444",
      sadness: "#6366f1",
      fear: "#8b5cf6",
      shame: "#ec4899",
      joy: "#10b981",
    },
  },
  dark: {
    text: "#ffffff",
    textSecondary: "#9ca3af",
    textTertiary: "#6b7280",
    textDisabled: "#4b5563",
    buttonText: "#ffffff",
    tabIconDefault: "#6b7280",
    tabIconSelected: "#c4a67c",
    link: "#c4a67c",
    backgroundRoot: "#1a1d21",
    backgroundDefault: "#24282e",
    backgroundSecondary: "#2f343b",
    backgroundTertiary: "#3a4049",
    accent: "#c4a67c",
    accentSecondary: "#4f46e5",
    accentGradientStart: "#4f46e5",
    accentGradientEnd: "#818cf8",
    border: "rgba(255,255,255,0.1)",
    emotions: {
      anxiety: "#f59e0b",
      anger: "#ef4444",
      sadness: "#6366f1",
      fear: "#8b5cf6",
      shame: "#ec4899",
      joy: "#10b981",
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  headline: {
    fontSize: 28,
    fontWeight: "300" as const,
  },
  title: {
    fontSize: 22,
    fontWeight: "400" as const,
  },
  body: {
    fontSize: 17,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  data: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  small: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const EmotionColors = Colors.dark.emotions;

export const SkillDisplayNames: Record<string, string> = {
  stop: "STOP",
  tip: "TIP",
  tip_paced_breathing: "Paced Breathing",
  tip_temperature: "Cold Water",
  opposite_action: "Opposite Action",
  check_facts: "Check the Facts",
  dear_man: "DEAR MAN",
  wise_mind: "Wise Mind",
  radical_acceptance: "Radical Acceptance",
  participate: "Participate",
  distract: "Distract (ACCEPTS)",
  self_soothe: "Self-Soothe",
  improve: "IMPROVE",
  pros_cons: "Pros and Cons",
};
