import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, queryClient } from "@/lib/query-client";
import type { RootStackParamList, ExtractedData, DiaryData } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "AICompletion">;

type Question = {
  id: string;
  type: "scale" | "binary" | "confirm" | "effectiveness";
  question: string;
  subtext?: string;
  field: string;
  scale?: number;
};

export default function AICompletionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const theme = Colors.dark;

  const { transcript, extractedData, entryId } = route.params;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const createEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      if (entryId) {
        return apiRequest("PUT", `/api/diary-entries/${entryId}`, data);
      }
      return apiRequest("POST", "/api/diary-entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary-entries"] });
    },
  });

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    try {
      const result = await apiRequest("POST", "/api/generate-follow-up", {
        extractedData,
        transcript,
      });
      setQuestions(result.questions || []);
    } catch (error) {
      console.error("Failed to generate questions:", error);
      setQuestions([
        {
          id: "sadness",
          type: "scale",
          question: "Any sadness come up today?",
          subtext: "You mentioned the day was rough",
          field: "sadness",
          scale: 5,
        },
        {
          id: "skill_helped",
          type: "effectiveness",
          question: "The skill you used - did it help?",
          field: "skill_effectiveness",
        },
        {
          id: "opposite_action",
          type: "confirm",
          question: "Going to the store when you wanted to isolate - that's Opposite Action.",
          subtext: "Should I log that skill?",
          field: "log_opposite_action",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answer: any) => {
    const currentQuestion = questions[currentStep];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.field]: answer,
    }));

    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeEntry();
    }
  };

  const completeEntry = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    const diaryData: DiaryData = {
      emotions: extractedData.emotions || {},
      urges: extractedData.urges || {},
      skills: extractedData.skills_used || [],
      behaviors: extractedData.behaviors || {},
      context: {
        promptingEvents: extractedData.context?.prompting_events || [],
        vulnerabilities: extractedData.context?.vulnerabilities || [],
      },
      actedOnUrges: answers.acted_on_urges === true || answers.acted_on_urges === "Yes",
      transcript,
    };

    Object.entries(answers).forEach(([key, value]) => {
      if (key.includes("_urge") || key === "self_harm_urge") {
        diaryData.urges[key.replace("_urge", "")] = typeof value === "number" ? value : 0;
      } else if (typeof value === "number" && !key.includes("urge")) {
        diaryData.emotions[key] = value;
      }
    });

    try {
      const result = await createEntryMutation.mutateAsync({
        date: today,
        ...diaryData,
        complete: true,
      });

      navigation.replace("FinalReview", {
        entryId: result.id,
        diaryData,
      });
    } catch (error) {
      console.error("Failed to save entry:", error);
    }
  };

  const handleSkip = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeEntry();
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const ScaleInput = ({ max = 5 }: { max?: number }) => (
    <View style={styles.scaleContainer}>
      {Array.from({ length: max + 1 }, (_, i) => (
        <Pressable
          key={i}
          onPress={() => handleAnswer(i)}
          style={({ pressed }) => [
            styles.scaleButton,
            pressed && styles.scaleButtonPressed,
          ]}
        >
          <ThemedText style={styles.scaleText} fontFamily="mono">
            {i}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const EffectivenessInput = () => (
    <View style={styles.effectivenessContainer}>
      {[
        { value: 5, label: "Yes, it helped" },
        { value: 4, label: "Tried, didn't help much" },
        { value: 3, label: "Tried but couldn't do it" },
      ].map((option) => (
        <Pressable
          key={option.value}
          onPress={() => handleAnswer(option.value)}
          style={({ pressed }) => [
            styles.effectivenessButton,
            pressed && styles.effectivenessButtonPressed,
          ]}
        >
          <ThemedText style={styles.effectivenessText}>
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const ConfirmInput = () => (
    <View style={styles.confirmContainer}>
      <Pressable
        onPress={() => handleAnswer(true)}
        style={({ pressed }) => [
          styles.confirmButtonYes,
          pressed && { opacity: 0.8 },
        ]}
      >
        <ThemedText style={styles.confirmTextYes}>Yes, log it</ThemedText>
      </Pressable>
      <Pressable
        onPress={() => handleAnswer(false)}
        style={({ pressed }) => [
          styles.confirmButtonNo,
          pressed && { opacity: 0.8 },
        ]}
      >
        <ThemedText style={styles.confirmTextNo}>Skip</ThemedText>
      </Pressable>
    </View>
  );

  const BinaryInput = () => (
    <View style={styles.binaryContainer}>
      <Pressable
        onPress={() => handleAnswer(true)}
        style={({ pressed }) => [
          styles.binaryButton,
          pressed && styles.binaryButtonPressed,
        ]}
      >
        <ThemedText style={styles.binaryText}>Yes</ThemedText>
      </Pressable>
      <Pressable
        onPress={() => handleAnswer(false)}
        style={({ pressed }) => [
          styles.binaryButton,
          pressed && styles.binaryButtonPressed,
        ]}
      >
        <ThemedText style={styles.binaryText}>No</ThemedText>
      </Pressable>
    </View>
  );

  const renderQuestion = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={styles.loadingText}>
            Preparing your follow-up questions...
          </ThemedText>
        </View>
      );
    }

    if (questions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText} fontFamily="serif">
            Your entry looks complete!
          </ThemedText>
          <Pressable
            onPress={completeEntry}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <ThemedText style={styles.saveButtonText}>Save Entry</ThemedText>
          </Pressable>
        </View>
      );
    }

    const question = questions[currentStep];

    return (
      <View style={styles.questionContainer}>
        <ThemedText style={styles.questionText} fontFamily="serif">
          {question.question}
        </ThemedText>
        {question.subtext ? (
          <ThemedText style={styles.subtextText}>
            {question.subtext}
          </ThemedText>
        ) : null}

        <View style={styles.inputSection}>
          {question.type === "scale" && <ScaleInput max={question.scale || 5} />}
          {question.type === "effectiveness" && <EffectivenessInput />}
          {question.type === "confirm" && <ConfirmInput />}
          {question.type === "binary" && <BinaryInput />}
        </View>
      </View>
    );
  };

  const progress = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleCancel} style={styles.cancelButton}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </Pressable>
        {!isLoading && questions.length > 0 ? (
          <ThemedText style={styles.stepText} fontFamily="mono">
            {currentStep + 1} / {questions.length}
          </ThemedText>
        ) : null}
      </View>

      {!isLoading && questions.length > 0 ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {renderQuestion()}
      </ScrollView>

      {!isLoading && questions.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Pressable onPress={handleSkip}>
            <ThemedText style={styles.skipText}>skip</ThemedText>
          </Pressable>
        </View>
      ) : null}
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: 10,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  stepText: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    height: 2,
    backgroundColor: Colors.dark.backgroundTertiary,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.lg,
    color: Colors.dark.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    marginBottom: Spacing.xl,
    color: Colors.dark.text,
  },
  saveButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: Colors.dark.backgroundRoot,
    fontSize: 15,
    fontWeight: "500",
  },
  questionContainer: {
    alignItems: "center",
  },
  questionText: {
    fontSize: 22,
    textAlign: "center",
    lineHeight: 32,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtextText: {
    fontSize: 13,
    textAlign: "center",
    color: Colors.dark.textTertiary,
    marginBottom: 28,
  },
  inputSection: {
    width: "100%",
    marginTop: 20,
  },
  scaleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  scaleButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.dark.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  scaleButtonPressed: {
    opacity: 0.8,
  },
  scaleText: {
    fontSize: 17,
    fontWeight: "500",
    color: Colors.dark.text,
  },
  effectivenessContainer: {
    gap: 10,
  },
  effectivenessButton: {
    backgroundColor: Colors.dark.backgroundTertiary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  effectivenessButtonPressed: {
    opacity: 0.8,
  },
  effectivenessText: {
    fontSize: 15,
    color: Colors.dark.text,
    textAlign: "left",
  },
  confirmContainer: {
    flexDirection: "row",
    gap: 10,
  },
  confirmButtonYes: {
    flex: 1,
    backgroundColor: Colors.dark.success,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmTextYes: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.dark.backgroundRoot,
  },
  confirmButtonNo: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundTertiary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmTextNo: {
    fontSize: 15,
    color: Colors.dark.text,
  },
  binaryContainer: {
    flexDirection: "row",
    gap: 10,
  },
  binaryButton: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundTertiary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  binaryButtonPressed: {
    opacity: 0.8,
  },
  binaryText: {
    fontSize: 15,
    color: Colors.dark.text,
  },
  footer: {
    alignItems: "center",
    paddingTop: Spacing.md,
  },
  skipText: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
  },
});
