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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import LiveDiaryCard, { DiaryCardData } from "@/components/LiveDiaryCard";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useWebRTC, ConversationMessage } from "@/hooks/useWebRTC";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { UserFieldConfig, TrackingType } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DETECTION_PATTERNS = {
  emotions: {
    emotion_misery: /\b(emotion.?misery|emotional.?misery|emotionally.?miserable|misery|miserable|awful|terrible|suffering)\b/i,
    physical_misery: /\b(physical.?misery|physically.?miserable|physical.?pain|body.?pain|headache|tired|exhausted|sore|aching|sick|nauseous)\b/i,
    joy: /\b(happy|joy|joyful|good|great|excited|pleased|content)\b/i,
    anger: /\b(angry|furious|rage|mad|pissed|irritated|annoyed|anger)\b/i,
    anxiety: /\b(anxious|worried|nervous|panic|stressed|tense|scared|anxiety)\b/i,
    sadness: /\b(sad|depressed|down|hopeless|low|blue|crying|sadness)\b/i,
    shame: /\b(shame|ashamed|embarrassed|guilty|humiliated)\b/i,
    fear: /\b(fear|afraid|frightened|terrified|fearful)\b/i,
  },
  urges: {
    self_harm: /\b(cut|cutting|hurt myself|self.?harm|burn|scratch|self-harm)\b/i,
    suicide: /\b(kill myself|suicide|suicidal|end it)\b/i,
    drugs: /\b(drink|drunk|high|using|relapse|craving|drugs|substances)\b/i,
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
    mindfulness: /\b(mindful|mindfulness|observe|describe|participate)\b/i,
  },
  intensity: {
    high: /\b(really|very|so|extremely|incredibly)\b/i,
    medium: /\b(pretty|somewhat|fairly|kind of)\b/i,
    low: /\b(a little|slightly|barely|mild)\b/i,
  },
  explicitValue: /\b(anxiety|anger|sadness|fear|shame|joy|misery|self-?harm|suicide|drugs|urges?)\s*(?:is\s*)?(?:at\s*)?(?:a\s*)?(\d)\s*(?:out of\s*5|\/\s*5)?/i,
  numericMention: /\b(\d)\s*(?:out of\s*5|\/\s*5)\b/i,
};

const emptyCardData: DiaryCardData = {
  urges: {},
  emotions: {},
  actions: {},
  substances: {},
  skills: {},
  behaviors: {},
};

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const theme = Colors.dark;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [cardData, setCardData] = useState<DiaryCardData>(emptyCardData);
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());
  const [uncertainFields, setUncertainFields] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const cardDataRef = useRef<DiaryCardData>(emptyCardData);
  const queryClient = useQueryClient();

  const { data: fieldConfigs } = useQuery<UserFieldConfig>({
    queryKey: ["/api/field-configs"],
  });

  const addEmotionMutation = useMutation({
    mutationFn: async ({ label, trackingType, scaleMax }: { label: string; trackingType: TrackingType; scaleMax?: number }) => {
      return apiRequest("POST", "/api/field-configs/emotion", { label, trackingType, scaleMax });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
    onError: (error) => {
      console.error("Failed to add custom emotion:", error);
    },
  });

  const addBehaviorMutation = useMutation({
    mutationFn: async ({ label, trackingType, scaleMax }: { label: string; trackingType: TrackingType; scaleMax?: number }) => {
      return apiRequest("POST", "/api/field-configs/behavior", { label, trackingType, scaleMax });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
    onError: (error) => {
      console.error("Failed to add custom behavior:", error);
    },
  });

  const handleAddCustomEmotion = (label: string, trackingType: TrackingType, scaleMax?: number) => {
    addEmotionMutation.mutate({ label, trackingType, scaleMax });
  };

  const handleAddCustomBehavior = (label: string, trackingType: TrackingType, scaleMax?: number) => {
    addBehaviorMutation.mutate({ label, trackingType, scaleMax });
  };

  const deleteEmotionMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return apiRequest("DELETE", `/api/field-configs/emotion/${fieldId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
    onError: (error) => {
      console.error("Failed to delete custom emotion:", error);
    },
  });

  const deleteBehaviorMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return apiRequest("DELETE", `/api/field-configs/behavior/${fieldId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-configs"] });
    },
    onError: (error) => {
      console.error("Failed to delete custom behavior:", error);
    },
  });

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

  const wordToNumber = (word: string): number | null => {
    const map: Record<string, number> = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
      "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
    };
    return map[word.toLowerCase()] ?? null;
  };

  const detectFields = useCallback((text: string, isAiMessage: boolean = false) => {
    const newData = { ...cardDataRef.current };
    const newGlow = new Set<string>();
    const newUncertain = new Set<string>();

    const explicitMatches = text.matchAll(/\b(emotion.?misery|physical.?misery|anxiety|anger|sadness|fear|shame|joy|misery|self-?harm|suicide|drugs|substances?|alcohol)\s*(?:is\s*)?(?:at\s*)?(?:a\s*)?(zero|one|two|three|four|five|\d)(?:\s*(?:out of\s*5|\/\s*5))?/gi);
    for (const match of explicitMatches) {
      const field = match[1].toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
      const value = wordToNumber(match[2]);
      
      const emotionMap: Record<string, string> = {
        emotion_misery: "emotion_misery",
        emotional_misery: "emotion_misery",
        physical_misery: "physical_misery",
        joy: "joy",
        anxiety: "anxiety",
        anger: "anger",
        sadness: "sadness",
        fear: "fear",
        shame: "shame",
        misery: "emotion_misery",
      };
      
      const urgeMap: Record<string, string> = {
        self_harm: "self_harm",
        selfharm: "self_harm",
        suicide: "suicide",
        drugs: "drugs",
        substance: "drugs",
        substances: "drugs",
        alcohol: "alcohol",
      };
      
      if (value !== null) {
        if (emotionMap[field]) {
          const emoKey = emotionMap[field];
          if (!newData.emotions[emoKey] || newData.emotions[emoKey].value === null) {
            newData.emotions[emoKey] = { value, detected: true };
            newGlow.add(`emotions.${emoKey}`);
          }
        } else if (urgeMap[field]) {
          const urgeKey = urgeMap[field];
          if (!newData.urges[urgeKey] || newData.urges[urgeKey].value === null) {
            newData.urges[urgeKey] = { value, detected: true };
            newGlow.add(`urges.${urgeKey}`);
          }
        }
      }
    }

    const urgeFieldMap: Record<string, string> = {
      suicide: "suicide",
      "self-harm": "self_harm",
      "self harm": "self_harm",
      selfharm: "self_harm",
      drugs: "drugs",
      substance: "drugs",
      substances: "drugs",
      alcohol: "alcohol",
      drink: "alcohol",
      drinking: "alcohol",
    };

    const emotionFieldMap: Record<string, string> = {
      emotion_misery: "emotion_misery",
      emotional_misery: "emotion_misery",
      physical_misery: "physical_misery",
      joy: "joy",
      anxiety: "anxiety",
      anger: "anger",
      sadness: "sadness",
      fear: "fear",
      shame: "shame",
      misery: "emotion_misery",
    };

    const extractFieldsFromList = (listText: string): { urges: string[]; emotions: string[] } => {
      const urges: string[] = [];
      const emotions: string[] = [];
      const normalized = listText.toLowerCase();
      
      Object.keys(urgeFieldMap).forEach(key => {
        if (normalized.includes(key)) {
          const mapped = urgeFieldMap[key];
          if (!urges.includes(mapped)) urges.push(mapped);
        }
      });
      
      Object.keys(emotionFieldMap).forEach(key => {
        if (normalized.includes(key)) {
          const mapped = emotionFieldMap[key];
          if (!emotions.includes(mapped)) emotions.push(mapped);
        }
      });
      
      return { urges, emotions };
    };

    const linkingPhrases = /,?\s*(?:they\s+)?(?:are|is|were|was|at)\s+(?:all\s+)?(?:at\s+)?(?:a\s+)?(zero|one|two|three|four|five|\d)\b/gi;
    const linkingMatches = [...text.matchAll(linkingPhrases)];
    for (const linkMatch of linkingMatches) {
      const value = wordToNumber(linkMatch[1]);
      if (value !== null) {
        const beforeMatch = text.substring(0, linkMatch.index!);
        const listMatch = beforeMatch.match(/(?:^|[.!?]\s*)(?:(?:so\s+)?for\s+)?([a-z][a-z,\s\-]*(?:and|or)\s+[a-z\-]+)\s*$/i);
        if (listMatch) {
          const listPart = listMatch[1];
          const { urges, emotions } = extractFieldsFromList(listPart);
          
          urges.forEach(urge => {
            if (!newData.urges[urge] || newData.urges[urge].value === null) {
              newData.urges[urge] = { value, detected: true };
              newGlow.add(`urges.${urge}`);
            }
          });
          
          emotions.forEach(emo => {
            if (!newData.emotions[emo] || newData.emotions[emo].value === null) {
              newData.emotions[emo] = { value, detected: true };
              newGlow.add(`emotions.${emo}`);
            }
          });
        }
      }
    }

    const groupedWithScore = text.match(/(?:urges?\s+(?:for\s+|today\s+(?:for\s+)?)?)?([a-z][a-z\s,\-]+(?:,?\s*(?:and|or)\s+[a-z\-]+)?)\s+at\s+(?:a\s*)?(zero|one|two|three|four|five|\d)/gi);
    if (groupedWithScore) {
      for (const match of groupedWithScore) {
        const valueMatch = match.match(/(zero|one|two|three|four|five|\d)\s*$/i);
        if (valueMatch) {
          const value = wordToNumber(valueMatch[1]);
          if (value !== null) {
            const listPart = match.replace(/(zero|one|two|three|four|five|\d)\s*$/i, "")
              .replace(/\s*at\s*(?:a\s*)?$/i, "");
            const { urges, emotions } = extractFieldsFromList(listPart);
            
            urges.forEach(urge => {
              if (!newData.urges[urge] || newData.urges[urge].value === null) {
                newData.urges[urge] = { value, detected: true };
                newGlow.add(`urges.${urge}`);
              }
            });
            
            emotions.forEach(emo => {
              if (!newData.emotions[emo] || newData.emotions[emo].value === null) {
                newData.emotions[emo] = { value, detected: true };
                newGlow.add(`emotions.${emo}`);
              }
            });
          }
        }
      }
    }

    const noUrgesPattern = /(?:no|zero|didn't have(?: any)?)\s+urges?\s+(?:for\s+|to\s+|toward\s+|today\s+(?:for\s+)?)?(.+?(?:,\s*.+?)*(?:,?\s+(?:and|or)\s+.+?)?)/gi;
    const noUrgesMatches = text.matchAll(noUrgesPattern);
    for (const match of noUrgesMatches) {
      const listPart = match[1];
      const { urges } = extractFieldsFromList(listPart);
      
      urges.forEach(urge => {
        if (!newData.urges[urge] || newData.urges[urge].value === null) {
          newData.urges[urge] = { value: 0, detected: true };
          newGlow.add(`urges.${urge}`);
        }
      });
    }

    const parseContextNumber = (ctx: string): number | null => {
      const numPattern = /(zero|one|two|three|four|five|\d)\s*(out of|\/)\s*5/i;
      const atPattern = /at\s*(?:a\s*)?(zero|one|two|three|four|five|\d)/i;
      const maybePattern = /maybe\s*(?:a\s*)?(zero|one|two|three|four|five|\d)/i;
      const numMatch = ctx.match(numPattern) || ctx.match(maybePattern) || ctx.match(atPattern);
      return numMatch ? wordToNumber(numMatch[1]) : null;
    };

    Object.entries(DETECTION_PATTERNS.emotions).forEach(([emo, pattern]) => {
      const match = text.match(pattern);
      if (match && !newData.emotions[emo]) {
        const ctx = text.substring(Math.max(0, match.index! - 50), match.index! + 50);
        let val = parseContextNumber(ctx);
        if (val === null) {
          val = DETECTION_PATTERNS.intensity.high.test(ctx) ? 4 :
            DETECTION_PATTERNS.intensity.medium.test(ctx) ? 3 : null;
        }
        newData.emotions[emo] = { value: val, detected: true };
        newGlow.add(`emotions.${emo}`);
        if (val === null) newUncertain.add(`emotions.${emo}`);
      }
    });

    Object.entries(DETECTION_PATTERNS.urges).forEach(([urge, pattern]) => {
      const match = text.match(pattern);
      if (match && !newData.urges[urge]) {
        const ctx = text.substring(Math.max(0, match.index! - 50), match.index! + 50);
        const val = parseContextNumber(ctx);
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

    const liedCountPattern = /\blied\s*(?:about\s*)?(once|twice|one|two|three|four|five|\d+)\s*(?:times?)?/gi;
    const liedMatches = [...text.matchAll(liedCountPattern)];
    if (liedMatches.length > 0) {
      const lastMatch = liedMatches[liedMatches.length - 1];
      const countWord = lastMatch[1].toLowerCase();
      const countMap: Record<string, number> = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5 };
      const count = (countMap[countWord] ?? parseInt(countWord, 10)) || 1;
      if (!newData.actions.lied || newData.actions.lied.value === null) {
        newData.actions.lied = { value: count, detected: true };
        newGlow.add("actions.lied");
      }
    }
    
    if (/didn't lie|no lies|honest today|was honest/.test(text) && !newData.actions.lied) {
      newData.actions.lied = { value: 0, detected: true };
      newGlow.add("actions.lied");
    }

    const usedSkillsPattern = /\b(?:skills?\s+(?:used|usage|rating)|used\s+skills?)\s*(?:is\s*)?(?:at\s*)?(?:a\s*)?(zero|one|two|three|four|five|six|seven|\d)(?:\s*(?:out of\s*7|\/\s*7))?/gi;
    const skillsRatingMatches = [...text.matchAll(usedSkillsPattern)];
    if (skillsRatingMatches.length > 0) {
      const lastMatch = skillsRatingMatches[skillsRatingMatches.length - 1];
      const ratingWord = lastMatch[1].toLowerCase();
      const ratingMap: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
      const rating = ratingMap[ratingWord] ?? parseInt(ratingWord, 10);
      if (rating >= 0 && rating <= 7) {
        if (!newData.actions.used_skills || newData.actions.used_skills.value === null) {
          newData.actions.used_skills = { value: rating, detected: true };
          newGlow.add("actions.used_skills");
        }
      }
    }

    const alcoholPattern = /\b(?:had|drank|consumed)\s*(one|two|three|four|five|\d+)\s*(beers?|glasses?|drinks?|shots?|wines?|cocktails?)/gi;
    const alcoholMatches = [...text.matchAll(alcoholPattern)];
    if (alcoholMatches.length > 0) {
      const lastMatch = alcoholMatches[alcoholMatches.length - 1];
      const countWord = lastMatch[1].toLowerCase();
      const countMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
      const count = (countMap[countWord] ?? parseInt(countWord, 10)) || 1;
      const drinkType = lastMatch[2].toLowerCase();
      newData.substances.alcohol = { value: `${count} ${drinkType}`, detected: true };
      newGlow.add("substances.alcohol");
    }

    if (/didn't (drink|have any)|no (alcohol|drinks)|sober/.test(text) && !newData.substances.alcohol) {
      newData.substances.alcohol = { value: "none", detected: true };
      newGlow.add("substances.alcohol");
    }

    const drugsPattern = /\b(?:used|smoked|took|had)\s*(one|two|three|four|five|\d+)?\s*(joints?|hits?|lines?|pills?|tabs?|doses?|grams?)\s*(?:of\s*)?(weed|marijuana|cocaine|heroin|meth|mdma|molly|ecstasy)?/gi;
    const drugsMatches = [...text.matchAll(drugsPattern)];
    if (drugsMatches.length > 0) {
      const lastMatch = drugsMatches[drugsMatches.length - 1];
      const countWord = lastMatch[1]?.toLowerCase() || "1";
      const countMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
      const count = (countMap[countWord] ?? parseInt(countWord, 10)) || 1;
      const unit = lastMatch[2]?.toLowerCase() || "";
      const drugType = lastMatch[3]?.toLowerCase() || "";
      newData.substances.illegal_drugs = { value: `${count} ${unit}${drugType ? ` ${drugType}` : ""}`.trim(), detected: true };
      newGlow.add("substances.illegal_drugs");
    }
    
    if (/didn't (use|do) (any )?(drugs|substances)|no (drugs|substances)|clean today|stayed clean/.test(text) && !newData.substances.illegal_drugs) {
      newData.substances.illegal_drugs = { value: "none", detected: true };
      newGlow.add("substances.illegal_drugs");
    }

    const prnOtcPattern = /\b(?:took|used|had)\s*(one|two|three|four|five|\d+)?\s*(ibuprofen|tylenol|advil|aspirin|benadryl|melatonin|otc|over.?the.?counter)\b/gi;
    const prnMatches = [...text.matchAll(prnOtcPattern)];
    if (prnMatches.length > 0) {
      const lastMatch = prnMatches[prnMatches.length - 1];
      const countWord = lastMatch[1]?.toLowerCase() || "1";
      const countMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
      const count = (countMap[countWord] ?? parseInt(countWord, 10)) || 1;
      const medType = lastMatch[2].toLowerCase();
      newData.substances.prn_otc_meds = { value: `${count} ${medType}`, detected: true };
      newGlow.add("substances.prn_otc_meds");
    }

    if (/took (my )?meds|medications? as prescribed|took prescribed/.test(text) && !newData.substances.meds_prescribed) {
      newData.substances.meds_prescribed = { value: "yes", detected: true };
      newGlow.add("substances.meds_prescribed");
    }
    if (/didn't take (my )?meds|skipped (my )?medication|missed (my )?meds/.test(text) && !newData.substances.meds_prescribed) {
      newData.substances.meds_prescribed = { value: "no", detected: true };
      newGlow.add("substances.meds_prescribed");
    }

    const customEmotions = fieldConfigs?.customEmotions || [];
    customEmotions.forEach(emotion => {
      const labelPattern = new RegExp(`\\b${emotion.label.toLowerCase().replace(/\s+/g, "\\s*")}\\b`, "i");
      const match = text.match(labelPattern);
      if (match && !newData.emotions[emotion.id]) {
        const ctx = text.substring(Math.max(0, match.index! - 50), match.index! + 50);
        let val = parseContextNumber(ctx);
        if (val === null) {
          val = DETECTION_PATTERNS.intensity.high.test(ctx) ? 4 :
            DETECTION_PATTERNS.intensity.medium.test(ctx) ? 3 : null;
        }
        newData.emotions[emotion.id] = { value: val, detected: true };
        newGlow.add(`emotions.${emotion.id}`);
        if (val === null) newUncertain.add(`emotions.${emotion.id}`);
      }
    });

    const customBehaviors = fieldConfigs?.customBehaviors || [];
    customBehaviors.forEach(behavior => {
      const labelPattern = new RegExp(`\\b${behavior.label.toLowerCase().replace(/\s+/g, "\\s*")}\\b`, "i");
      if (labelPattern.test(text) && !newData.behaviors?.[behavior.id]) {
        if (!newData.behaviors) newData.behaviors = {};
        newData.behaviors[behavior.id] = true;
        newGlow.add(`behaviors.${behavior.id}`);
      }
    });

    cardDataRef.current = newData;
    setCardData(newData);
    if (newGlow.size > 0) {
      setGlowingFields(newGlow);
      setUncertainFields(newUncertain);
      setTimeout(() => setGlowingFields(new Set()), 800);
    }
  }, [fieldConfigs]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setTranscript(text);
    detectFields(text);
    
    if (isFinal) {
      console.log("Finalized transcript turn:", text);
    }
  }, [detectFields]);

  const handleMessages = useCallback((newMessages: ConversationMessage[]) => {
    setMessages(newMessages);
    
    const allTranscriptText = newMessages.map(m => m.text).join(" ");
    detectFields(allTranscriptText);
    
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage && lastMessage.speaker === "ai") {
      detectFields(lastMessage.text, true);
    }
  }, [detectFields]);

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
      setTranscript("");
      setMessages([]);
      setCardData(emptyCardData);
      cardDataRef.current = emptyCardData;
      setGlowingFields(new Set());
      setUncertainFields(new Set());
      setRecordingTime(0);

      const success = await connectRealtime(handleTranscript, handleConnectionState, handleMessages);
      
      if (!success) {
        console.error("Failed to connect to realtime API");
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
          });
        } catch (error) {
          console.error("Processing error:", error);
          setIsProcessing(false);
          navigation.replace("AICompletion", {
            transcript: finalTranscript,
            extractedData: { missing: ["all"] },
          });
        }
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
      disconnect();
    }
    navigation.goBack();
  };

  const isWebPlatform = Platform.OS === "web";

  if (!isWebPlatform && !isSupported) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
        <View style={styles.permissionContent}>
          <Feather name="smartphone" size={64} color={theme.textTertiary} />
          <ThemedText style={styles.permissionTitle}>Development Build Required</ThemedText>
          <ThemedText style={styles.permissionText}>
            Voice recording requires the full app installation.{"\n\n"}
            You're currently using Expo Go, which doesn't support voice features.{"\n\n"}
            To use voice check-in:{"\n"}
            - Use the web version at this URL, or{"\n"}
            - Install the Development Build on your device
          </ThemedText>
        </View>
      </View>
    );
  }

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
            onPress={() => {
              setConnectionState("idle");
            }}
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
            Analyzing your entry...
          </ThemedText>
        </View>
      ) : (
        <View style={styles.content}>
          <ScrollView
            style={styles.mainScrollView}
            contentContainerStyle={[
              styles.mainScrollContent,
              { paddingBottom: 80 + insets.bottom }
            ]}
            showsVerticalScrollIndicator={true}
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

            <View style={styles.transcriptSection}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.transcriptScroll}
                nestedScrollEnabled={true}
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
                    Speak about your day...
                  </ThemedText>
                )}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={[styles.footer, { bottom: insets.bottom + Spacing.md }]}>
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
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 14,
    flexGrow: 1,
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
  footer: {
    position: "absolute",
    left: 14,
    right: 14,
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
