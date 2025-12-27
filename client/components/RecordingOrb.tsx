import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  interpolate,
  Extrapolation,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Colors, Spacing } from "@/constants/theme";
import { ThemedText } from "./ThemedText";

type RecordingState = "idle" | "connecting" | "recording-muted" | "recording-unmuted" | "processing";

interface RecordingOrbProps {
  state: RecordingState;
  isMuted: boolean;
  isHoldActive: boolean;
  recordingTime: number;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RecordingOrb({
  state,
  isMuted,
  isHoldActive,
  recordingTime,
  onPress,
  onPressIn,
  onPressOut,
  onStartRecording,
  onStopRecording,
}: RecordingOrbProps) {
  const theme = Colors.dark;
  
  const breathScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const holdScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const pulseRingScale = useSharedValue(1);
  const pulseRingOpacity = useSharedValue(0);

  const isRecording = state === "recording-muted" || state === "recording-unmuted";
  const isUnmuted = state === "recording-unmuted" || (!isMuted && isRecording);

  useEffect(() => {
    if (isRecording && isUnmuted) {
      breathScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 })
        ),
        -1,
        true
      );
    } else if (isRecording && !isUnmuted) {
      breathScale.value = withTiming(0.95, { duration: 300 });
      glowOpacity.value = withTiming(0.1, { duration: 300 });
    } else if (state === "connecting") {
      breathScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(0.95, { duration: 800 })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withTiming(0.4, { duration: 800 }),
        -1,
        true
      );
    } else {
      cancelAnimation(breathScale);
      cancelAnimation(glowOpacity);
      breathScale.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [isRecording, isUnmuted, state]);

  useEffect(() => {
    if (isHoldActive) {
      holdScale.value = withSpring(1.1, { damping: 15, stiffness: 150 });
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1000 }),
          withTiming(1.2, { duration: 0 })
        ),
        -1
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1000 }),
          withTiming(0.5, { duration: 0 })
        ),
        -1
      );
    } else {
      holdScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      ringScale.value = withTiming(1, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isHoldActive]);

  useEffect(() => {
    if (isUnmuted && isRecording) {
      pulseRingScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1500 }),
          withTiming(1, { duration: 0 })
        ),
        -1
      );
      pulseRingOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1500 }),
          withTiming(0.4, { duration: 0 })
        ),
        -1
      );
    } else {
      cancelAnimation(pulseRingScale);
      cancelAnimation(pulseRingOpacity);
      pulseRingScale.value = 1;
      pulseRingOpacity.value = 0;
    }
  }, [isUnmuted, isRecording]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value * holdScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: breathScale.value * 1.3 }],
  }));

  const holdRingStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: pulseRingOpacity.value,
    transform: [{ scale: pulseRingScale.value }],
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getOrbBackground = () => {
    if (state === "processing") return theme.backgroundTertiary;
    if (state === "connecting") return theme.accentMuted;
    if (isRecording && isUnmuted) return theme.accent;
    if (isRecording && !isUnmuted) return theme.backgroundSecondary;
    return theme.accentMuted;
  };

  const getIconColor = () => {
    if (state === "processing") return theme.textTertiary;
    if (state === "connecting") return theme.accent;
    if (isRecording && isUnmuted) return theme.backgroundRoot;
    if (isRecording && !isUnmuted) return theme.accent;
    return theme.accent;
  };

  const getStatusText = () => {
    if (state === "processing") return "Processing...";
    if (state === "connecting") return "Connecting...";
    if (isRecording && isUnmuted) return "Listening...";
    if (isRecording && !isUnmuted) return "Tap or hold to speak";
    return "Tap to start recording";
  };

  const getHintText = () => {
    if (state === "connecting") return "Setting up session...";
    if (state === "processing") return "Analyzing your entry...";
    if (!isRecording) return "Tap the orb to begin";
    if (isRecording && !isUnmuted) return "Hold to speak, tap to toggle";
    return "Release to pause, tap to toggle";
  };

  return (
    <View style={styles.container}>
      <View style={styles.orbWrapper}>
        <Animated.View style={[styles.glowRing, glowStyle, { backgroundColor: theme.accent }]} />
        
        <Animated.View style={[styles.pulseRing, pulseRingStyle, { borderColor: theme.accent }]} />
        
        <Animated.View style={[styles.holdRing, holdRingStyle, { borderColor: theme.accent }]} />
        
        <AnimatedPressable
          style={[styles.orb, orbStyle, { backgroundColor: getOrbBackground() }]}
          onPress={state === "idle" && onStartRecording ? onStartRecording : (isRecording ? onPress : undefined)}
          onPressIn={isRecording ? onPressIn : undefined}
          onPressOut={isRecording ? onPressOut : undefined}
          disabled={state === "processing"}
        >
          {state === "processing" || state === "connecting" ? (
            <View style={styles.iconContainer}>
              <Animated.View style={styles.loadingDots}>
                <View style={[styles.loadingDot, { backgroundColor: theme.accent }]} />
                <View style={[styles.loadingDot, { backgroundColor: theme.accent, opacity: 0.6 }]} />
                <View style={[styles.loadingDot, { backgroundColor: theme.accent, opacity: 0.3 }]} />
              </Animated.View>
            </View>
          ) : isRecording && !isUnmuted ? (
            <View style={styles.iconContainer}>
              <Feather name="mic-off" size={48} color={getIconColor()} />
            </View>
          ) : (
            <View style={styles.iconContainer}>
              <Feather name="mic" size={48} color={getIconColor()} />
            </View>
          )}
        </AnimatedPressable>
      </View>

      {isRecording ? (
        <View style={styles.timerContainer}>
          <View style={[styles.recordingDot, { backgroundColor: isUnmuted ? theme.danger : theme.textTertiary }]} />
          <ThemedText style={styles.timerText} fontFamily="mono">
            {formatTime(recordingTime)}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.statusContainer}>
        <ThemedText style={styles.statusText}>{getStatusText()}</ThemedText>
        <ThemedText style={styles.hintText}>{getHintText()}</ThemedText>
      </View>

      {isRecording || state === "connecting" ? (
        <Pressable
          style={[styles.doneButton, { backgroundColor: theme.accent }]}
          onPress={onStopRecording}
        >
          <View style={styles.doneButtonContent}>
            <View style={[styles.doneIndicator, { backgroundColor: theme.success }]} />
            <View style={[styles.doneIndicatorSecond, { backgroundColor: theme.warning }]} />
            <ThemedText style={[styles.doneButtonText, { color: theme.backgroundRoot }]}>
              Done
            </ThemedText>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  orbWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  holdRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      },
    }),
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingDots: {
    flexDirection: "row",
    gap: 6,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerText: {
    fontSize: 18,
    color: Colors.dark.text,
  },
  statusContainer: {
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  statusText: {
    fontSize: 17,
    color: Colors.dark.text,
    fontWeight: "500",
  },
  hintText: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
  },
  doneButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 28,
    minWidth: 200,
  },
  doneButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  doneIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  doneIndicatorSecond: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});

export default RecordingOrb;
