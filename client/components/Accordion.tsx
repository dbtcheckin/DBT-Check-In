import React, { useState } from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface AccordionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: object;
}

const springConfig = {
  damping: 18,
  mass: 0.5,
  stiffness: 180,
};

export function Accordion({
  title,
  defaultExpanded = false,
  children,
  style,
  titleStyle,
}: AccordionProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const progress = useSharedValue(defaultExpanded ? 1 : 0);
  const scale = useSharedValue(1);

  const toggleExpanded = () => {
    setExpanded(!expanded);
    progress.value = withSpring(expanded ? 0 : 1, springConfig);
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    maxHeight: interpolate(progress.value, [0, 1], [0, 1000], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={headerAnimatedStyle}>
        <Pressable
          onPress={toggleExpanded}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.header,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText type="caption" style={[styles.headerText, titleStyle]}>
            {title}
          </ThemedText>
          <Animated.View style={chevronAnimatedStyle}>
            <Feather
              name="chevron-down"
              size={18}
              color={theme.textSecondary}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>

      {expanded ? (
        <Animated.View
          style={[
            styles.content,
            { backgroundColor: theme.backgroundDefault },
            contentAnimatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  headerText: {
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    marginTop: -Spacing.sm,
    paddingTop: Spacing.lg,
  },
});
