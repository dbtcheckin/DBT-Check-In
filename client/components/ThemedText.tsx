import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography, Fonts, Colors } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "headline" | "title" | "body" | "caption" | "data" | "small" | "link";
  fontFamily?: "sans" | "serif" | "mono";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  fontFamily = "sans",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "headline":
        return Typography.headline;
      case "title":
        return Typography.title;
      case "body":
        return Typography.body;
      case "caption":
        return Typography.caption;
      case "data":
        return Typography.data;
      case "small":
        return Typography.small;
      case "link":
        return Typography.body;
      default:
        return Typography.body;
    }
  };

  const getFontFamily = () => {
    if (!Fonts) return undefined;
    switch (fontFamily) {
      case "serif":
        return Fonts.serif;
      case "mono":
        return Fonts.mono;
      default:
        return Fonts.sans;
    }
  };

  return (
    <Text
      style={[
        { color: getColor(), fontFamily: getFontFamily() },
        getTypeStyle(),
        style,
      ]}
      {...rest}
    />
  );
}
