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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import LiveDiaryCard, { DiaryCardData } from "@/components/LiveDiaryCard";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DETECTION_PATTERNS = {
  emotions: {
    anger: /\b(angry|furious|rage|mad|pissed|irritated|annoyed)\b/i,
    anxiety: /\b(anxious|worried|nervous|panic|stressed|tense|scared)\b/i,
    sadness: /\b(sad|depressed|down|hopeless|low|blue|crying)\b/i,
    joy: /\b(happy|joy|good|great|excited|pleased|content)\b/i,
    shame: /\b(shame|ashamed|embarrassed|guilty|humiliated)\b/i,
    misery: /\b(misery|miserable|awful|terrible|suffering)\b/i,
  },
  urges: {
    self_harm: /\b(cut|cutting|hurt myself|self.?harm|burn|scratch)\b/i,
    suicide: /\b(kill myself|suicide|suicidal|end it)\b/i,
    drugs: /\b(drink|drunk|high|using|relapse|craving)\b/i,
  },
  skills: {
    stop: /\bSTOP\b|stopped (myself|before)/i,
    tip: /\b(TIP|cold water|ice|paced breathing|breathing exercise)\b/i,
    opposite_action: /\b(opposite action|made myself|forced myself|went anyway)\b/i,
    dear_man: /\bDEAR\s?MAN\b/i,
    check_facts: /\b(check.*(the )?facts|checked facts)\b/i,
    radical_acceptance: /\b(radical acceptance|radically accept)\b/i,
    wise_mind: /\b(wise mind|wisemind)\b/i,
    distract: /\b(distract|distraction|ACCEPTS)\b/i,
    self_soothe: /\b(self.?sooth|comfort)\b/i,
    problem_solve: /\b(problem.?solv|figured out)\b/i,
  },
  intensity: {
    high: /\b(really|very|so|extremely|incredibly)\b/i,
    medium: /\b(pretty|somewhat|fairly|kind of)\b/i,
    low: /\b(a little|slightly|barely|mild)\b/i,
  },
};

const emptyCardData: DiaryCardData = {
  urges: {},
  emotions: {},
  actions: {},
  substances: {},
  skills: {},
};

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
  const [cardData, setCardData] = useState<DiaryCardData>(emptyCardData);
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());
  const [uncertainFields, setUncertainFields] = useState<Set<string>>(new Set());
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    const checkPermission = async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);
    };
    checkPermission();
  }, []);

  useEffect(() => {
    if (isRecording) {
      pulseOpacity.value = withRepeat(
        withTiming(0.5, { duration: 1000 }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
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

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const detectFields = (text: string) => {
    const newData = { ...cardData };
    const newGlow = new Set<string>();
    const newUncertain = new Set<string>();

    Object.entries(DETECTION_PATTERNS.emotions).forEach(([emo, pattern]) => {
      const match = text.match(pattern);
      if (match && !newData.emotions[emo]) {
        const ctx = text.substring(Math.max(0, match.index! - 50), match.index! + 50);
        const numMatch = ctx.match(/(\d)\s*(out of|\/)\s*5/) || ctx.match(/maybe a (\d)/);
        let val = numMatch ? parseInt(numMatch[1]) : 
          DETECTION_PATTERNS.intensity.high.test(ctx) ? 4 :
          DETECTION_PATTERNS.intensity.medium.test(ctx) ? 3 : null;
        newData.emotions[emo] = { value: val, detected: true };
        newGlow.add(`emotions.${emo}`);
        if (val === null) newUncertain.add(`emotions.${emo}`);
      }
    });

    Object.entries(DETECTION_PATTERNS.urges).forEach(([urge, pattern]) => {
      const match = text.match(pattern);
      if (match && !newData.urges[urge]) {
        const ctx = text.substring(Math.max(0, match.index! - 50), match.index! + 50);
        const numMatch = ctx.match(/(\d)\s*(out of|\/)\s*5/) || ctx.match(/maybe a (\d)/);
        const val = numMatch ? parseInt(numMatch[1]) : null;
        newData.urges[urge] = { value: val, detected: true };
        newGlow.add(`urges.${urge}`);
        if (val === null) newUncertain.add(`urges.${urge}`);
      }
    });

    Object.entries(DETECTION_PATTERNS.skills).forEach(([skill, pattern]) => {
      if (pattern.test(text) && !newData.skills[skill]) {
        newData.skills[skill] = { used: true, detected: true };
        newGlow.add(`skills.${skill}`);
      }
    });

    if (/didn't (drink|have any)|no (alcohol|drinks)|sober/.test(text) && !newData.substances.alcohol) {
      newData.substances.alcohol = { value: "none", detected: true };
      newGlow.add("substances.alcohol");
    }

    setCardData(newData);
    setGlowingFields(newGlow);
    setUncertainFields(newUncertain);
    setTimeout(() => setGlowingFields(new Set()), 800);
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
      setCardData(emptyCardData);
      setGlowingFields(new Set());
      setUncertainFields(new Set());
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
            detectFields(transcriptText);

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

  const orbSize = 80 + audioLevel * 15;

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
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
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.recordingDot, pulseStyle]} />
          <ThemedText style={styles.timerText} fontFamily="mono">
            {formatTime(recordingTime)}
          </ThemedText>
        </View>
      </View>

      {isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={styles.processingText}>
            Analyzing your entry...
          </ThemedText>
        </View>
      ) : (
        <View style={styles.content}>
          <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cardContainer}>
              <LiveDiaryCard
                data={cardData}
                glowingFields={glowingFields}
                uncertainFields={uncertainFields}
              />
            </View>
          </ScrollView>

          <View style={styles.orbSection}>
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={styles.orbContainer}
            >
              <View
                style={[
                  styles.orb,
                  {
                    width: orbSize,
                    height: orbSize,
                    backgroundColor: isRecording ? theme.backgroundTertiary : theme.backgroundSecondary,
                    shadowColor: isRecording ? theme.accentGlow : "transparent",
                    shadowOpacity: isRecording ? 0.8 : 0,
                    shadowRadius: isRecording ? 25 + audioLevel * 20 : 0,
                  },
                ]}
              />
            </Pressable>
          </View>

          <View style={styles.transcriptSection}>
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
                {transcript || "Speak about your day..."}
                {transcript && isRecording ? (
                  <ThemedText style={styles.cursor}>|</ThemedText>
                ) : null}
              </ThemedText>
            </ScrollView>
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.doneButtonPressed,
              ]}
            >
              {isRecording ? (
                <View style={styles.doneButtonContent}>
                  <View style={styles.stopSquare} />
                  <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                </View>
              ) : (
                <View style={styles.doneButtonContent}>
                  <Feather name="mic" size={18} color={theme.text} />
                  <ThemedText style={styles.doneButtonText}>Start Recording</ThemedText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.danger,
  },
  timerText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  processingText: {
    marginTop: Spacing.lg,
    color: Colors.dark.textSecondary,
  },
  cardScroll: {
    flex: 1,
    maxHeight: "50%",
  },
  cardContainer: {
    marginBottom: Spacing.md,
  },
  orbSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    borderRadius: BorderRadius.full,
    shadowOffset: { width: 0, height: 0 },
  },
  transcriptSection: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    minHeight: 70,
    maxHeight: 100,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcript: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 22,
  },
  transcriptPlaceholder: {
    color: Colors.dark.textTertiary,
  },
  cursor: {
    color: Colors.dark.accent,
  },
  footer: {
    paddingTop: Spacing.sm,
  },
  doneButton: {
    backgroundColor: Colors.dark.backgroundTertiary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneButtonPressed: {
    opacity: 0.8,
  },
  doneButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stopSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: Colors.dark.danger,
  },
  doneButtonText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "500",
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
});
