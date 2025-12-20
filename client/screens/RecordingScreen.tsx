import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useAudioRecorder, RecordingPresets, AudioModule } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const theme = Colors.dark;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const orbScale = useSharedValue(1);
  const orbGlow = useSharedValue(0.3);

  useEffect(() => {
    const checkPermission = async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);
    };
    checkPermission();
  }, []);

  useEffect(() => {
    if (isRecording) {
      orbScale.value = withRepeat(
        withTiming(1.1, { duration: 1500 }),
        -1,
        true
      );
      orbGlow.value = withRepeat(
        withTiming(0.8, { duration: 1500 }),
        -1,
        true
      );
    } else {
      orbScale.value = withSpring(1);
      orbGlow.value = withTiming(0.3);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setAudioLevel(0.3 + Math.random() * 0.5);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          return;
        }
        setHasPermission(true);
      }

      await audioRecorder.record();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript("");
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          
          try {
            const transcriptionResult = await apiRequest(
              "POST",
              "/api/transcribe",
              { audioBase64: base64 }
            );
            const transcriptText = transcriptionResult.text || "";
            setTranscript(transcriptText);

            const extractedData = await apiRequest(
              "POST",
              "/api/extract-diary-data",
              { transcript: transcriptText }
            );

            setIsProcessing(false);
            navigation.replace("AICompletion", {
              transcript: transcriptText,
              extractedData,
            });
          } catch (error) {
            console.error("Processing error:", error);
            setIsProcessing(false);
            navigation.replace("AICompletion", {
              transcript: "Unable to transcribe audio. Please try again.",
              extractedData: { missing: ["all"] },
            });
          }
        };
        
        reader.readAsDataURL(blob);
      } else {
        setIsProcessing(false);
        navigation.replace("AICompletion", {
          transcript: "No audio recorded. Please try again.",
          extractedData: { missing: ["all"] },
        });
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (isRecording) {
      try {
        await audioRecorder.stop();
      } catch (e) {
        // Ignore errors when cancelling
      }
    }
    navigation.goBack();
  };

  const orbSize = 120 + audioLevel * 50;

  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.permissionContainer, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
        <View style={styles.permissionContent}>
          <Feather name="mic-off" size={64} color={theme.textTertiary} />
          <ThemedText style={styles.permissionTitle}>Microphone Access Required</ThemedText>
          <ThemedText style={styles.permissionText}>
            Please enable microphone access in your device settings to record voice diary entries.
          </ThemedText>
          {Platform.OS !== "web" && (
            <Pressable
              onPress={async () => {
                try {
                  const { Linking } = await import("react-native");
                  await Linking.openSettings();
                } catch (e) {
                  // Settings not available
                }
              }}
              style={styles.settingsButton}
            >
              <ThemedText style={styles.settingsButtonText}>Open Settings</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleCancel} style={styles.cancelButton}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </Pressable>
        <ThemedText style={styles.phaseText} type="caption">
          Phase 1 of 2
        </ThemedText>
      </View>

      <View style={styles.content}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <ThemedText style={styles.processingText} type="body">
              Analyzing your entry...
            </ThemedText>
          </View>
        ) : (
          <>
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={styles.orbContainer}
            >
              <Animated.View style={[styles.orbWrapper, orbAnimatedStyle]}>
                <View
                  style={[
                    styles.orbGlow,
                    {
                      width: orbSize + 60,
                      height: orbSize + 60,
                      opacity: isRecording ? 0.3 + audioLevel * 0.4 : 0.1,
                    },
                  ]}
                />
                <LinearGradient
                  colors={
                    isRecording
                      ? [theme.accentGradientEnd, theme.accentGradientStart, "#3730a3"]
                      : [theme.backgroundTertiary, theme.backgroundSecondary]
                  }
                  style={[
                    styles.orb,
                    { width: orbSize, height: orbSize },
                  ]}
                >
                  <Feather
                    name="mic"
                    size={48}
                    color="#ffffff"
                  />
                </LinearGradient>
              </Animated.View>
            </Pressable>

            <ThemedText style={styles.timer} type="data" fontFamily="mono">
              {formatTime(recordingTime)}
            </ThemedText>

            <ThemedText style={styles.instruction} type="caption">
              {isRecording
                ? "Tap the orb when you're done speaking"
                : "Tap the orb to start recording"}
            </ThemedText>

            <View style={styles.transcriptContainer}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.transcriptScroll}
                onContentSizeChange={() =>
                  scrollViewRef.current?.scrollToEnd({ animated: true })
                }
              >
                <ThemedText
                  style={[
                    styles.transcript,
                    !transcript && styles.transcriptPlaceholder,
                  ]}
                  fontFamily="serif"
                >
                  {transcript || "Start speaking about your day..."}
                </ThemedText>
              </ScrollView>
            </View>
          </>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {isRecording && !isProcessing ? (
          <Pressable
            onPress={stopRecording}
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.doneButtonPressed,
            ]}
          >
            <ThemedText style={styles.doneButtonText}>Done Speaking</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    justifyContent: "flex-start",
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  settingsButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  settingsButtonText: {
    color: "#1a1d21",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  cancelButton: {
    padding: Spacing.sm,
  },
  cancelText: {
    color: Colors.dark.accent,
    fontSize: 17,
  },
  phaseText: {
    color: Colors.dark.textTertiary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  processingContainer: {
    alignItems: "center",
  },
  processingText: {
    marginTop: Spacing.lg,
    color: Colors.dark.textSecondary,
  },
  orbContainer: {
    marginBottom: Spacing.xl,
  },
  orbWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.accentGradientStart,
  },
  orb: {
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: {
    fontSize: 32,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  instruction: {
    color: Colors.dark.textTertiary,
    marginBottom: Spacing.xl,
  },
  transcriptContainer: {
    width: "100%",
    maxHeight: 128,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcript: {
    color: Colors.dark.textSecondary,
    fontSize: 17,
    lineHeight: 26,
  },
  transcriptPlaceholder: {
    fontStyle: "italic",
    color: Colors.dark.textTertiary,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
  },
  doneButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  doneButtonPressed: {
    opacity: 0.8,
  },
  doneButtonText: {
    color: "#1a1d21",
    fontSize: 17,
    fontWeight: "600",
  },
});
