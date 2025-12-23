import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import LiveDiaryCard, { DiaryCardData } from "@/components/LiveDiaryCard";
import { Accordion } from "@/components/Accordion";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useWebRTC, ConversationMessage } from "@/hooks/useWebRTC";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { DiaryEntry, UserFieldConfig, TrackingType } from "@shared/schema";

type RouteProps = RouteProp<RootStackParamList, "DiaryEntryDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const convertEntryToCardData = (entry: DiaryEntry): DiaryCardData => {
  const emotions: DiaryCardData["emotions"] = {};
  const urges: DiaryCardData["urges"] = {};
  const actions: DiaryCardData["actions"] = {};
  const substances: DiaryCardData["substances"] = {};
  const skills: DiaryCardData["skills"] = {};
  const behaviors: DiaryCardData["behaviors"] = {};

  if (entry.emotions) {
    Object.entries(entry.emotions).forEach(([key, value]) => {
      emotions[key] = { value: value as number, detected: true };
    });
  }

  if (entry.urges) {
    Object.entries(entry.urges).forEach(([key, value]) => {
      urges[key] = { value: value as number, detected: true };
    });
  }

  if (entry.actions) {
    Object.entries(entry.actions).forEach(([key, value]) => {
      actions[key] = { value: value as number | boolean, detected: true };
    });
  }

  if (entry.substances) {
    Object.entries(entry.substances).forEach(([key, value]) => {
      substances[key] = { value: String(value), detected: true };
    });
  }

  if (entry.skills && Array.isArray(entry.skills)) {
    (entry.skills as string[]).forEach((skill) => {
      skills[skill] = { used: true, detected: true };
    });
  }

  if (entry.behaviors) {
    Object.entries(entry.behaviors).forEach(([key, value]) => {
      behaviors[key] = Boolean(value);
    });
  }

  return { emotions, urges, actions, substances, skills, behaviors };
};

const emptyCardData: DiaryCardData = {
  urges: {},
  emotions: {},
  actions: {},
  substances: {},
  skills: {},
  behaviors: {},
};

export default function DiaryEntryDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { date } = route.params;
  const theme = Colors.dark;
  const queryClient = useQueryClient();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [cardData, setCardData] = useState<DiaryCardData>(emptyCardData);
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());
  const [uncertainFields, setUncertainFields] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const cardDataRef = useRef<DiaryCardData>(emptyCardData);

  const { data: entries = [] } = useQuery<DiaryEntry[]>({
    queryKey: ["/api/diary-entries", { startDate: date, endDate: date }],
  });

  const entry = entries.find((e) => e.date === date);

  const { data: fieldConfigs } = useQuery<UserFieldConfig>({
    queryKey: ["/api/field-configs"],
  });

  useEffect(() => {
    if (entry) {
      const converted = convertEntryToCardData(entry);
      setCardData(converted);
      cardDataRef.current = converted;
    }
  }, [entry]);

  const addEmotionMutation = useMutation({
    mutationFn: async ({ label, trackingType, scaleMax }: { label: string; trackingType: TrackingType; scaleMax?: number }) => {
      return apiRequest("POST", "/api/field-configs/emotion", { label, trackingType, scaleMax });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
  });

  const addBehaviorMutation = useMutation({
    mutationFn: async ({ label, trackingType, scaleMax }: { label: string; trackingType: TrackingType; scaleMax?: number }) => {
      return apiRequest("POST", "/api/field-configs/behavior", { label, trackingType, scaleMax });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
  });

  const deleteEmotionMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return apiRequest("DELETE", `/api/field-configs/emotion/${fieldId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
  });

  const deleteBehaviorMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return apiRequest("DELETE", `/api/field-configs/behavior/${fieldId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
  });

  const handleAddCustomEmotion = (label: string, trackingType: TrackingType, scaleMax?: number) => {
    addEmotionMutation.mutate({ label, trackingType, scaleMax });
  };

  const handleAddCustomBehavior = (label: string, trackingType: TrackingType, scaleMax?: number) => {
    addBehaviorMutation.mutate({ label, trackingType, scaleMax });
  };

  const handleDeleteCustomEmotion = (fieldId: string) => {
    deleteEmotionMutation.mutate(fieldId);
  };

  const handleDeleteCustomBehavior = (fieldId: string) => {
    deleteBehaviorMutation.mutate(fieldId);
  };

  const { connectRealtime, disconnect, getTranscript, getMessages, connectionError, isSupported } = useWebRTC();

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

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

  const parseStoredTranscript = (transcript: string | null | undefined): ConversationMessage[] => {
    if (!transcript) return [];
    const lines = transcript.split("\n").filter((line) => line.trim());
    return lines.map((line, index) => {
      const isUser = line.toLowerCase().startsWith("user:") || line.toLowerCase().startsWith("you:");
      const isAI = line.toLowerCase().startsWith("ai:") || line.toLowerCase().startsWith("assistant:");
      let text = line;
      let speaker: "user" | "ai" = "ai";
      
      if (isUser) {
        text = line.replace(/^(user|you):\s*/i, "");
        speaker = "user";
      } else if (isAI) {
        text = line.replace(/^(ai|assistant):\s*/i, "");
        speaker = "ai";
      }
      
      return { id: String(index), speaker, text, isFinal: true, timestamp: Date.now() };
    });
  };

  const storedMessages = parseStoredTranscript(entry?.transcript);
  const displayMessages = messages.length > 0 ? messages : storedMessages;

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setTranscript(text);
    if (isFinal) {
      console.log("Finalized transcript turn:", text);
    }
  }, []);

  const handleMessages = useCallback((newMessages: ConversationMessage[]) => {
    setMessages(newMessages);
  }, []);

  const handleConnectionState = useCallback((state: "connecting" | "connected" | "disconnected" | "error") => {
    setConnectionState(state);
    if (state === "connected") {
      setIsRecording(true);
    } else if (state === "disconnected" || state === "error") {
      if (isRecording) {
        setIsRecording(false);
      }
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setMessages([]);
      setTranscript("");
      setRecordingTime(0);
      
      const success = await connectRealtime(handleTranscript, handleConnectionState, handleMessages);
      
      if (!success) {
        console.error("Failed to connect to realtime API");
        setConnectionState("error");
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
      setConnectionState("error");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      disconnect();
      
      const userMessages = messages.filter(m => m.speaker === "user");
      const messagesTranscript = userMessages.map(m => m.text).join(" ");
      const finalTranscript = transcript || getTranscript() || messagesTranscript;

      if (finalTranscript && finalTranscript.trim()) {
        try {
          const extractedData = await apiRequest(
            "POST",
            "/api/extract-diary-data",
            { transcript: finalTranscript }
          );

          setIsProcessing(false);
          navigation.replace("AICompletion", {
            transcript: finalTranscript,
            extractedData,
            entryId: entry?.id,
          });
        } catch (error) {
          console.error("Processing error:", error);
          setIsProcessing(false);
          navigation.replace("AICompletion", {
            transcript: finalTranscript,
            extractedData: { missing: ["all"] },
            entryId: entry?.id,
          });
        }
      } else {
        setIsProcessing(false);
        navigation.replace("AICompletion", {
          transcript: "No audio recorded. Please try again.",
          extractedData: { missing: ["all"] },
          entryId: entry?.id,
        });
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (isRecording) {
      disconnect();
      setIsRecording(false);
    }
    navigation.goBack();
  };

  const isWebPlatform = Platform.OS === "web";

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <ThemedText style={styles.cancelText}>Back</ThemedText>
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="calendar" size={48} color={theme.textTertiary} />
          <ThemedText style={styles.emptyText}>No entry for this day</ThemedText>
        </View>
      </View>
    );
  }

  if (!isWebPlatform && !isSupported) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <ThemedText style={styles.cancelText}>Back</ThemedText>
          </Pressable>
          <ThemedText style={styles.dateHeader}>{formattedDate}</ThemedText>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.cardContainer}>
            <LiveDiaryCard
              data={cardData}
              glowingFields={glowingFields}
              uncertainFields={uncertainFields}
              customEmotions={fieldConfigs?.customEmotions || []}
              customBehaviors={fieldConfigs?.customBehaviors || []}
            />
          </View>

          {displayMessages.length > 0 ? (
            <View style={styles.accordionWrapper}>
              <Accordion title="Conversation" defaultExpanded={showTranscript} titleStyle={styles.accordionTitle}>
                <View style={styles.conversationContent}>
                  <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
                    {displayMessages.map((message) => (
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
                        <ThemedText style={styles.messageText} fontFamily="serif">
                          {message.text}
                        </ThemedText>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </Accordion>
            </View>
          ) : null}

          <View style={styles.notSupportedNotice}>
            <Feather name="smartphone" size={24} color={theme.textTertiary} />
            <ThemedText style={styles.notSupportedText}>
              Voice editing requires web browser or development build
            </ThemedText>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable style={[styles.doneButton, styles.doneButtonDisabled]} disabled>
            <View style={styles.doneButtonContent}>
              <Feather name="mic" size={18} color={theme.textTertiary} />
              <ThemedText style={[styles.doneButtonText, { color: theme.textTertiary }]}>Voice Not Available</ThemedText>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  if (connectionState === "error" && connectionError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <ThemedText style={styles.cancelText}>Back</ThemedText>
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
          <ThemedText style={styles.cancelText}>{isRecording ? "Cancel" : "Back"}</ThemedText>
        </Pressable>
        <View style={styles.timerContainer}>
          {isRecording ? (
            <>
              <Animated.View style={[styles.recordingDot, pulseStyle]} />
              <ThemedText style={styles.timerText} fontFamily="mono">
                {formatTime(recordingTime)}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.dateHeader}>{dayName}</ThemedText>
          )}
        </View>
        <View style={{ width: 50 }} />
      </View>

      {isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={styles.processingText}>
            Updating your entry...
          </ThemedText>
        </View>
      ) : (
        <View style={styles.content}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollContent}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.cardContainer}>
              <LiveDiaryCard
                data={cardData}
                glowingFields={glowingFields}
                uncertainFields={uncertainFields}
                customEmotions={fieldConfigs?.customEmotions || []}
                customBehaviors={fieldConfigs?.customBehaviors || []}
                onAddCustomEmotion={handleAddCustomEmotion}
                onAddCustomBehavior={handleAddCustomBehavior}
                onDeleteCustomEmotion={handleDeleteCustomEmotion}
                onDeleteCustomBehavior={handleDeleteCustomBehavior}
              />
            </View>

            {isRecording ? (
              <View style={styles.liveTranscriptSection}>
                <ScrollView style={styles.transcriptScroll}>
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
                          {!message.isFinal ? (
                            <ThemedText style={styles.cursor}>|</ThemedText>
                          ) : null}
                        </ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={[styles.messageText, styles.transcriptPlaceholder]} fontFamily="serif">
                      Speak to update your entry...
                    </ThemedText>
                  )}
                </ScrollView>
              </View>
            ) : displayMessages.length > 0 ? (
              <View style={styles.accordionWrapper}>
                <Accordion title="Conversation" defaultExpanded={showTranscript} titleStyle={styles.accordionTitle}>
                  <View style={styles.conversationContent}>
                    <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
                      {displayMessages.map((message) => (
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
                          <ThemedText style={styles.messageText} fontFamily="serif">
                            {message.text}
                          </ThemedText>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </Accordion>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              disabled={connectionState === "connecting"}
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.doneButtonPressed,
                connectionState === "connecting" && styles.doneButtonDisabled,
              ]}
            >
              {connectionState === "connecting" ? (
                <View style={styles.doneButtonContent}>
                  <ActivityIndicator size="small" color={theme.text} />
                  <ThemedText style={styles.doneButtonText}>Connecting...</ThemedText>
                </View>
              ) : isRecording ? (
                <View style={styles.doneButtonContent}>
                  <View style={styles.connectedIndicator} />
                  <View style={styles.stopSquare} />
                  <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                </View>
              ) : (
                <View style={styles.doneButtonContent}>
                  <Feather name="mic" size={18} color={theme.text} />
                  <ThemedText style={styles.doneButtonText}>Update Entry</ThemedText>
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
    width: 50,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  dateHeader: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "500",
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
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
  },
  cardContainer: {
    marginBottom: Spacing.sm,
  },
  accordionWrapper: {
    marginBottom: Spacing.lg,
  },
  accordionTitle: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  conversationContent: {
    maxHeight: 200,
  },
  transcriptSection: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  liveTranscriptSection: {
    flex: 1,
    minHeight: 100,
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
  messageContainer: {
    marginBottom: 12,
  },
  speakerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  userBadge: {
    opacity: 1,
  },
  aiBadge: {
    opacity: 1,
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: "600",
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
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  messageStreaming: {
    opacity: 0.85,
  },
  transcriptPlaceholder: {
    color: Colors.dark.textTertiary,
  },
  cursor: {
    color: Colors.dark.accent,
  },
  footer: {
    paddingHorizontal: 14,
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
  doneButtonDisabled: {
    opacity: 0.6,
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
  connectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  doneButtonText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.md,
    color: Colors.dark.textSecondary,
    textAlign: "center",
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
  notSupportedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  notSupportedText: {
    flex: 1,
    color: Colors.dark.textTertiary,
    fontSize: 13,
  },
});
