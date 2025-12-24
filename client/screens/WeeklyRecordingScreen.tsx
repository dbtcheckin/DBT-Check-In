import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import LiveWeeklyCard, { WeeklyCardData } from "@/components/LiveWeeklyCard";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useWebRTC, ConversationMessage } from "@/hooks/useWebRTC";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { WeeklySessionData } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WEEKLY_DETECTION_PATTERNS = {
  sessionUrges: {
    quit_therapy: /\b(?:urge\s+to\s+)?quit\s+therapy|quit(?:ting)?\s+therapy|stop\s+therapy\b/i,
    use_drugs: /\b(?:urge\s+to\s+)?use\s+drugs?|drug\s+urge|substance\s+urge\b/i,
    suicide: /\b(?:urge\s+to\s+)?(?:commit\s+)?suicide|suicidal\s+(?:urge|thought)\b/i,
  },
  beliefs: {
    emotions: /\b(?:can\s+)?regulate\s+(?:my\s+)?emotions?|emotion(?:al)?\s+regulation|control\s+(?:my\s+)?emotions?\b/i,
    actions: /\b(?:can\s+)?regulate\s+(?:my\s+)?actions?|action\s+regulation|control\s+(?:my\s+)?actions?\b/i,
    thoughts: /\b(?:can\s+)?regulate\s+(?:my\s+)?thoughts?|thought\s+regulation|control\s+(?:my\s+)?thoughts?\b/i,
  },
  weeklySections: {
    medChanges: /\b(?:medication|med|meds?)\s+(?:changes?|changed|adjustments?|adjusted|new|started|stopped|increased|decreased)\b/i,
    homework: /\bhomework|assigned|assignment|practice|practiced\b/i,
    skillsFocus: /\bskills?\s+focus|focus(?:ing)?\s+(?:on\s+)?skills?|working\s+on|practicing\b/i,
  },
};

function createEmptyCardData(): WeeklyCardData {
  return {
    sessionUrges: {},
    beliefToRegulate: {},
    medChanges: undefined,
    homework: undefined,
    skillsFocus: undefined,
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getWeekDateRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    end: sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weekEndDate: sunday.toISOString().split("T")[0],
  };
}

function wordToNumber(word: string): number | null {
  const normalized = word.toLowerCase().trim();
  const map: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
    "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  };
  const parsed = parseInt(normalized, 10);
  if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
    return Math.min(parsed, 5);
  }
  const result = map[normalized];
  return result !== undefined ? Math.min(result, 5) : null;
}

export default function WeeklyRecordingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const theme = Colors.dark;
  const { start, end, weekEndDate } = getWeekDateRange();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [cardData, setCardData] = useState<WeeklyCardData>(() => createEmptyCardData());
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());
  const [uncertainFields, setUncertainFields] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const cardDataRef = useRef<WeeklyCardData>(createEmptyCardData());

  const { connectRealtime, disconnect, getTranscript, getMessages, connectionError, isSupported, toggleMute, setMutedState, isMuted } = useWebRTC();

  const [isHoldActive, setIsHoldActive] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const HOLD_THRESHOLD_MS = 150;

  const handleMicPressIn = useCallback(() => {
    holdTimeoutRef.current = setTimeout(() => {
      setIsHoldActive(true);
      setMutedState(false);
    }, HOLD_THRESHOLD_MS);
  }, [setMutedState]);

  const handleMicPressOut = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (isHoldActive) {
      setMutedState(true);
      setIsHoldActive(false);
    }
  }, [isHoldActive, setMutedState]);

  const handleMicPress = useCallback(() => {
    if (!isHoldActive) {
      toggleMute();
    }
  }, [isHoldActive, toggleMute]);

  const pulseOpacity = useSharedValue(1);

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
  }, [isRecording, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const saveMutation = useMutation({
    mutationFn: async (weeklyData: WeeklySessionData) => {
      return apiRequest("POST", "/api/weekly-session", {
        weekEndDate,
        weeklySession: weeklyData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary-entries"] });
      navigation.goBack();
    },
  });

  const parseWeeklyFromTranscript = useCallback((text: string) => {
    const current = cardDataRef.current;
    const newData: WeeklyCardData = {
      sessionUrges: { ...current.sessionUrges },
      beliefToRegulate: { ...current.beliefToRegulate },
      medChanges: current.medChanges,
      homework: current.homework,
      skillsFocus: current.skillsFocus,
    };
    const newGlow = new Set<string>();
    const newUncertain = new Set<string>();
    const lowerText = text.toLowerCase();

    const sessionUrgePatterns = [
      { pattern: /(?:urge\s+to\s+)?quit(?:ting)?\s+therapy[^.]*?(zero|one|two|three|four|five|\d)/gi, field: "quit_therapy" },
      { pattern: /(?:urge\s+to\s+)?use\s+drugs?[^.]*?(zero|one|two|three|four|five|\d)/gi, field: "use_drugs" },
      { pattern: /(?:urge\s+to\s+)?(?:commit\s+)?suicid(?:e|al)[^.]*?(zero|one|two|three|four|five|\d)/gi, field: "suicide" },
      { pattern: /quit\s+therapy\s+(?:is\s+)?(?:at\s+)?(?:a\s+)?(zero|one|two|three|four|five|\d)/gi, field: "quit_therapy" },
      { pattern: /drug(?:s)?\s+(?:urge\s+)?(?:is\s+)?(?:at\s+)?(?:a\s+)?(zero|one|two|three|four|five|\d)/gi, field: "use_drugs" },
      { pattern: /suicid(?:e|al)\s+(?:urge\s+)?(?:is\s+)?(?:at\s+)?(?:a\s+)?(zero|one|two|three|four|five|\d)/gi, field: "suicide" },
    ];

    for (const { pattern, field } of sessionUrgePatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const value = wordToNumber(match[1]);
        if (value !== null && (!newData.sessionUrges[field] || newData.sessionUrges[field].value === null)) {
          newData.sessionUrges[field] = { value, detected: true };
          newGlow.add(`sessionUrges.${field}`);
        }
      }
    }

    const beliefPatterns = [
      { pattern: /(?:belief|believe|can)\s+(?:i\s+can\s+)?regulate\s+(?:my\s+)?emotion(?:s)?[^.]*?(zero|one|two|three|four|five|\d)/gi, field: "emotions" },
      { pattern: /(?:belief|believe|can)\s+(?:i\s+can\s+)?regulate\s+(?:my\s+)?action(?:s)?[^.]*?(zero|one|two|three|four|five|\d)/gi, field: "actions" },
      { pattern: /(?:belief|believe|can)\s+(?:i\s+can\s+)?regulate\s+(?:my\s+)?thought(?:s)?[^.]*?(zero|one|two|three|four|five|\d)/gi, field: "thoughts" },
      { pattern: /emotion(?:s|al)?\s+(?:regulation\s+)?(?:is\s+)?(?:at\s+)?(?:a\s+)?(zero|one|two|three|four|five|\d)/gi, field: "emotions" },
      { pattern: /action(?:s)?\s+(?:regulation\s+)?(?:is\s+)?(?:at\s+)?(?:a\s+)?(zero|one|two|three|four|five|\d)/gi, field: "actions" },
      { pattern: /thought(?:s)?\s+(?:regulation\s+)?(?:is\s+)?(?:at\s+)?(?:a\s+)?(zero|one|two|three|four|five|\d)/gi, field: "thoughts" },
    ];

    for (const { pattern, field } of beliefPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const value = wordToNumber(match[1]);
        if (value !== null && (!newData.beliefToRegulate[field] || newData.beliefToRegulate[field].value === null)) {
          newData.beliefToRegulate[field] = { value, detected: true };
          newGlow.add(`beliefs.${field}`);
        }
      }
    }

    if (!newData.medChanges) {
      const medPatterns = [
        /medication\s+(?:change|changes|changed)[:\s]+([^.!?]+)/i,
        /(?:started|stopped|increased|decreased|changed)\s+(?:my\s+)?(?:medication|meds?)[:\s]+([^.!?]+)/i,
        /(?:new\s+)?med(?:s|ication)?\s+(?:is|are)[:\s]+([^.!?]+)/i,
        /(?:no\s+)?(?:medication|med)\s+changes/i,
      ];
      for (const pattern of medPatterns) {
        const match = text.match(pattern);
        if (match) {
          newData.medChanges = match[1]?.trim() || "No changes";
          newGlow.add("medChanges");
          break;
        }
      }
    }

    if (!newData.homework) {
      const hwPatterns = [
        /homework[:\s]+([^.!?]+)/i,
        /(?:my\s+)?assignment[:\s]+([^.!?]+)/i,
        /assigned\s+(?:to\s+)?(?:work\s+on\s+)?([^.!?]+)/i,
      ];
      for (const pattern of hwPatterns) {
        const match = text.match(pattern);
        if (match) {
          newData.homework = match[1]?.trim();
          newGlow.add("homework");
          break;
        }
      }
    }

    if (!newData.skillsFocus) {
      const skillsPatterns = [
        /(?:skills?\s+)?focus(?:ing)?(?:\s+on)?[:\s]+([^.!?]+)/i,
        /working\s+on[:\s]+([^.!?]+)/i,
        /practicing[:\s]+([^.!?]+)/i,
        /focus(?:ing)?\s+(?:on\s+)?(?:skills?\s+)?(?:like\s+)?([^.!?]+)/i,
      ];
      for (const pattern of skillsPatterns) {
        const match = text.match(pattern);
        if (match) {
          newData.skillsFocus = match[1]?.trim();
          newGlow.add("skillsFocus");
          break;
        }
      }
    }

    cardDataRef.current = newData;
    setCardData(newData);
    setGlowingFields(newGlow);
    setUncertainFields(newUncertain);

    setTimeout(() => setGlowingFields(new Set()), 2000);
  }, []);

  const handleTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
    parseWeeklyFromTranscript(text);
  }, [parseWeeklyFromTranscript]);

  const handleConnectionState = useCallback((state: "connecting" | "connected" | "disconnected" | "error") => {
    setConnectionState(state);
    if (state === "connected") {
      setIsRecording(true);
    } else if (state === "disconnected" || state === "error") {
      setIsRecording(false);
    }
  }, []);

  const handleMessagesUpdate = useCallback((msgs: ConversationMessage[]) => {
    setMessages([...msgs]);
  }, []);

  const startRecording = async () => {
    setRecordingTime(0);
    const freshData = createEmptyCardData();
    setCardData(freshData);
    cardDataRef.current = freshData;
    await connectRealtime(handleTranscriptUpdate, handleConnectionState, handleMessagesUpdate);
  };

  const stopRecording = () => {
    disconnect();
    setIsRecording(false);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  const handleSave = async () => {
    const data = cardDataRef.current;
    const weeklyData: WeeklySessionData = {
      sessionUrges: Object.fromEntries(
        Object.entries(data.sessionUrges).map(([k, v]) => [k, v.value ?? 0])
      ),
      beliefToRegulate: Object.fromEntries(
        Object.entries(data.beliefToRegulate).map(([k, v]) => [k, v.value ?? 0])
      ),
      medChanges: data.medChanges,
      homework: data.homework,
      skillsFocus: data.skillsFocus,
    };
    
    await saveMutation.mutateAsync(weeklyData);
  };

  const handleCancel = () => {
    if (isRecording) {
      disconnect();
    }
    navigation.goBack();
  };

  const hasAnyData = Object.keys(cardData.sessionUrges).length > 0 || 
    Object.keys(cardData.beliefToRegulate).length > 0 || 
    !!cardData.medChanges || 
    !!cardData.homework || 
    !!cardData.skillsFocus ||
    messages.length > 0;
  const weekRange = `${start.toUpperCase()} - ${end.toUpperCase()}`;

  if (connectionState === "error" && connectionError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
        <View style={styles.permissionContent}>
          <Feather name="alert-circle" size={64} color={theme.danger} />
          <ThemedText style={styles.permissionTitle}>Connection Error</ThemedText>
          <ThemedText style={styles.permissionText}>{connectionError}</ThemedText>
          <Pressable
            onPress={() => setConnectionState("idle")}
            style={styles.settingsButton}
          >
            <ThemedText style={styles.settingsButtonText}>Try Again</ThemedText>
          </Pressable>
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
          {isRecording ? (
            <Animated.View style={[styles.recordingDot, pulseStyle]} />
          ) : null}
          <ThemedText style={styles.timerText} fontFamily="mono">
            {formatTime(recordingTime)}
          </ThemedText>
        </View>
      </View>

      {isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={styles.processingText}>
            Processing your entry...
          </ThemedText>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.cardContainer}>
            <LiveWeeklyCard
              data={cardData}
              glowingFields={glowingFields}
              uncertainFields={uncertainFields}
              weekRange={weekRange}
            />
          </View>

          <View style={styles.transcriptSection}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.transcriptScroll}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {messages.length > 0 ? (
                messages.map((message) => (
                  <View key={message.id} style={styles.messageContainer}>
                    <View style={[
                      styles.speakerBadge,
                      message.speaker === "user" ? styles.userBadge : styles.aiBadge
                    ]}>
                      <Feather 
                        name={message.speaker === "user" ? "user" : "cpu"} 
                        size={10} 
                        color={message.speaker === "user" ? theme.accent : theme.accentSecondary} 
                      />
                      <ThemedText style={[
                        styles.speakerLabel,
                        message.speaker === "user" ? styles.userLabel : styles.aiLabel
                      ]}>
                        {message.speaker === "user" ? "You" : "AI"}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[
                        styles.messageText,
                        !message.isFinal && styles.messageStreaming,
                      ]}
                      fontFamily="serif"
                    >
                      {message.text}
                      {!message.isFinal && isRecording ? (
                        <ThemedText style={styles.cursor}>|</ThemedText>
                      ) : null}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText style={[styles.transcript, styles.transcriptPlaceholder]} fontFamily="serif">
                  Speak about your week...
                </ThemedText>
              )}
            </ScrollView>
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            {isRecording ? (
              <Pressable
                onPressIn={handleMicPressIn}
                onPressOut={handleMicPressOut}
                onPress={handleMicPress}
                style={({ pressed }) => [
                  styles.muteButton,
                  isMuted && styles.muteButtonActive,
                  (pressed || isHoldActive) && styles.muteButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? "Hold to speak, release to mute" : "Microphone active, tap or release to mute"}
              >
                <Feather name={isMuted ? "mic-off" : "mic"} size={20} color={isMuted ? theme.danger : theme.text} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              disabled={connectionState === "connecting"}
              style={({ pressed }) => [
                styles.recordButton,
                pressed && styles.recordButtonPressed,
                connectionState === "connecting" && styles.recordButtonDisabled,
              ]}
            >
              {connectionState === "connecting" ? (
                <View style={styles.recordButtonContent}>
                  <ActivityIndicator size="small" color={theme.text} />
                  <ThemedText style={styles.recordButtonText}>Connecting...</ThemedText>
                </View>
              ) : isRecording ? (
                <View style={styles.recordButtonContent}>
                  <View style={styles.connectedIndicator} />
                  <View style={styles.stopSquare} />
                  <ThemedText style={styles.recordButtonText}>Done</ThemedText>
                </View>
              ) : (
                <View style={styles.recordButtonContent}>
                  <Feather name="mic" size={18} color={theme.text} />
                  <ThemedText style={styles.recordButtonText}>Start Recording</ThemedText>
                </View>
              )}
            </Pressable>

            {hasAnyData && !isRecording ? (
              <Pressable
                onPress={handleSave}
                disabled={saveMutation.isPending}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                  saveMutation.isPending && styles.saveButtonDisabled,
                ]}
              >
                <View style={styles.saveButtonContent}>
                  <Feather name="check" size={16} color={Colors.dark.backgroundRoot} />
                  <ThemedText style={styles.saveButtonText}>
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </ThemedText>
                </View>
              </Pressable>
            ) : null}
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
  cardContainer: {
    flexShrink: 0,
    marginBottom: Spacing.sm,
  },
  transcriptSection: {
    flex: 1,
    minHeight: 60,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcript: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.text,
  },
  transcriptPlaceholder: {
    color: Colors.dark.textTertiary,
    fontStyle: "italic",
  },
  messageContainer: {
    marginBottom: Spacing.sm,
  },
  speakerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  userBadge: {},
  aiBadge: {},
  speakerLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userLabel: {
    color: Colors.dark.accent,
  },
  aiLabel: {
    color: Colors.dark.accentSecondary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.text,
  },
  messageStreaming: {
    color: Colors.dark.textSecondary,
  },
  cursor: {
    color: Colors.dark.accent,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  recordButton: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  recordButtonPressed: {
    opacity: 0.8,
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  recordButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
  },
  connectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.success,
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.dark.danger,
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.backgroundRoot,
  },
  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.dark.text,
    marginTop: Spacing.lg,
  },
  permissionText: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  settingsButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  settingsButtonText: {
    color: Colors.dark.backgroundRoot,
    fontSize: 15,
    fontWeight: "600",
  },
  muteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  muteButtonActive: {
    backgroundColor: Colors.dark.backgroundTertiary,
    borderColor: Colors.dark.danger,
  },
  muteButtonPressed: {
    opacity: 0.7,
  },
});
