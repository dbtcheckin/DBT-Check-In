import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { SimulationState } from "@/lib/simulation";

interface SimulationIndicatorProps {
  state: SimulationState;
  compact?: boolean;
}

const getIntensityColor = (intensity: number): string => {
  if (intensity <= 1) return "#4ade80";
  if (intensity <= 3) return "#facc15";
  if (intensity <= 5) return "#fb923c";
  if (intensity <= 7) return "#f87171";
  return "#ef4444";
};

const getIntensityLabel = (intensity: number): string => {
  if (intensity <= 1) return "Calm";
  if (intensity <= 3) return "Mild";
  if (intensity <= 5) return "Moderate";
  if (intensity <= 7) return "High";
  return "Crisis";
};

export function SimulationIndicator({ state, compact = false }: SimulationIndicatorProps) {
  const theme = Colors.dark;
  const pulseValue = useSharedValue(1);

  React.useEffect(() => {
    if (state.active) {
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      pulseValue.value = 1;
    }
  }, [state.active]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const intensityColor = getIntensityColor(state.currentIntensity);

  if (!state.active && state.mode !== "debrief") {
    return null;
  }

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, pulseStyle]}>
        <View style={[styles.compactBadge, { backgroundColor: intensityColor + "30" }]}>
          <View style={[styles.compactDot, { backgroundColor: intensityColor }]} />
          <ThemedText style={[styles.compactText, { color: intensityColor }]}>
            {state.mode === "debrief" ? "Debrief" : `L${state.currentIntensity}`}
          </ThemedText>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, pulseStyle]}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundElevated }]}>
        <View style={styles.header}>
          <Feather name="activity" size={14} color={intensityColor} />
          <ThemedText style={[styles.title, { color: intensityColor }]}>
            {state.mode === "debrief" ? "Simulation Debrief" : "Training Mode"}
          </ThemedText>
        </View>
        
        {state.mode === "simulation" ? (
          <>
            <View style={styles.intensityRow}>
              <ThemedText style={styles.label}>Intensity:</ThemedText>
              <View style={styles.intensityBar}>
                {[...Array(10)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.intensitySegment,
                      {
                        backgroundColor:
                          i <= state.currentIntensity
                            ? intensityColor
                            : theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <ThemedText style={[styles.intensityValue, { color: intensityColor }]}>
                {state.currentIntensity}/9
              </ThemedText>
            </View>
            <View style={styles.statusRow}>
              <ThemedText style={[styles.statusLabel, { color: intensityColor }]}>
                {getIntensityLabel(state.currentIntensity)}
              </ThemedText>
              <ThemedText style={styles.turnCount}>
                Turn {state.turnCount}
              </ThemedText>
            </View>
          </>
        ) : (
          <View style={styles.debriefInfo}>
            <ThemedText style={styles.debriefText}>
              {state.outcome === "success"
                ? "Patient successfully de-escalated"
                : state.outcome === "failure"
                ? "Simulation ended at crisis level"
                : "Simulation ended early"}
            </ThemedText>
          </View>
        )}
        
        <ThemedText style={styles.exitHint}>
          Say "END DBT PATIENT SIMULATION" to exit
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  badge: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  intensityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  intensityBar: {
    flex: 1,
    flexDirection: "row",
    gap: 2,
  },
  intensitySegment: {
    flex: 1,
    height: 8,
    borderRadius: 2,
  },
  intensityValue: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 30,
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  turnCount: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
  },
  exitHint: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    marginTop: Spacing.sm,
    textAlign: "center",
    fontStyle: "italic",
  },
  compactContainer: {},
  compactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactText: {
    fontSize: 11,
    fontWeight: "600",
  },
  debriefInfo: {
    marginVertical: Spacing.sm,
  },
  debriefText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
});
