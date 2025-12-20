import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { apiRequest, getApiUrl } from "@/lib/query-client";
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cardData, setCardData] = useState<DiaryCardData>(emptyCardData);
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());
  const [uncertainFields, setUncertainFields] = useState<Set<string>>(new Set());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const commitIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    return () => {
      cleanupWebAudio();
    };
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const detectFields = useCallback((text: string) => {
    setCardData(prevData => {
      const newData = { ...prevData };
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

      setGlowingFields(newGlow);
      setUncertainFields(newUncertain);
      setTimeout(() => setGlowingFields(new Set()), 800);
      
      return newData;
    });
  }, []);

  const cleanupWebAudio = () => {
    if (commitIntervalRef.current) {
      clearInterval(commitIntervalRef.current);
      commitIntervalRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const getWebSocketUrl = () => {
    const apiUrl = getApiUrl();
    const wsProtocol = apiUrl.startsWith("https") ? "wss" : "ws";
    const host = apiUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `${wsProtocol}://${host}/ws/realtime`;
  };

  const startWebRecording = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
    } catch (micError) {
      console.error("Microphone error:", micError);
      setConnectionError("Microphone access denied");
      setIsConnecting(false);
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = async () => {
        console.log("Connected to realtime proxy");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "session.ready") {
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
            const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current!);
            
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = floatTo16BitPCM(inputData);
              const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
              
              wsRef.current.send(JSON.stringify({
                type: "input_audio_buffer.append",
                audio: base64
              }));
            };

            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);

            commitIntervalRef.current = setInterval(() => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: "input_audio_buffer.commit"
                }));
              }
            }, 1500);

            setIsConnecting(false);
            setIsRecording(true);
            setRecordingTime(0);
            setTranscript("");
            setCardData(emptyCardData);
            setGlowingFields(new Set());
            setUncertainFields(new Set());
          } else if (data.type === "conversation.item.input_audio_transcription.delta") {
            if (data.delta) {
              setTranscript(prev => {
                const newText = prev + data.delta;
                detectFields(newText);
                return newText;
              });
            }
          } else if (data.type === "conversation.item.input_audio_transcription.completed") {
            if (data.transcript) {
              setTranscript(prev => {
                const newTranscript = prev + (prev ? " " : "") + data.transcript;
                detectFields(newTranscript);
                return newTranscript;
              });
            }
          } else if (data.type === "input_audio_buffer.speech_started") {
            console.log("Speech detected");
          } else if (data.type === "input_audio_buffer.speech_stopped") {
            console.log("Speech ended - committing buffer");
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "input_audio_buffer.commit"
              }));
            }
          } else if (data.type === "error") {
            console.error("Realtime API error:", data.error);
            setConnectionError(data.error?.message || "Voice service error");
            setIsConnecting(false);
            cleanupWebAudio();
          }
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      };

      wsRef.current.onerror = () => {
        setConnectionError("Connection error");
        setIsConnecting(false);
        cleanupWebAudio();
      };

      wsRef.current.onclose = () => {
        if (isRecording) {
          setIsRecording(false);
        }
      };

    } catch (error) {
      console.error("Connection error:", error);
      setConnectionError(error instanceof Error ? error.message : "Connection failed");
      setIsConnecting(false);
      cleanupWebAudio();
    }
  };

  const stopWebRecording = async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "input_audio_buffer.commit"
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    cleanupWebAudio();
    setIsRecording(false);
    
    return transcript;
  };

  const startNativeRecording = async () => {
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

  const stopNativeRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        
        return new Promise<string>((resolve) => {
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
              resolve(transcriptText);
            } catch (error) {
              console.error("Transcription error:", error);
              resolve("");
            }
          };
          
          reader.readAsDataURL(blob);
        });
      }
      return "";
    } catch (error) {
      console.error("Failed to stop recording:", error);
      return "";
    }
  };

  const startRecording = async () => {
    if (Platform.OS === "web") {
      await startWebRecording();
    } else {
      await startNativeRecording();
    }
  };

  const stopRecording = async () => {
    setIsProcessing(true);
    
    let finalTranscript = transcript;
    
    if (Platform.OS === "web") {
      finalTranscript = await stopWebRecording();
    } else {
      finalTranscript = await stopNativeRecording();
    }

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
      });
    } catch (error) {
      console.error("Processing error:", error);
      setIsProcessing(false);
      navigation.replace("AICompletion", {
        transcript: finalTranscript || "Unable to transcribe audio. Please try again.",
        extractedData: { missing: ["all"] },
      });
    }
  };

  const handleCancel = async () => {
    if (isRecording) {
      if (Platform.OS === "web") {
        cleanupWebAudio();
      } else {
        try {
          await audioRecorder.stop();
        } catch (e) {
          // Ignore
        }
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
          <Animated.View style={[styles.recordingDot, pulseStyle, !isRecording && { opacity: 0 }]} />
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
      ) : isConnecting ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={styles.processingText}>
            Connecting to voice service...
          </ThemedText>
        </View>
      ) : connectionError ? (
        <View style={styles.processingContainer}>
          <Feather name="alert-circle" size={48} color={theme.danger} />
          <ThemedText style={styles.errorText}>{connectionError}</ThemedText>
          <Pressable onPress={startRecording} style={styles.retryButton}>
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
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
    gap: Spacing.md,
  },
  processingText: {
    color: Colors.dark.textSecondary,
  },
  errorText: {
    color: Colors.dark.danger,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.dark.backgroundTertiary,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.dark.text,
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
