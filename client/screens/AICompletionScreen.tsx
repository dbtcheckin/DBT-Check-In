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
import { Card } from "@/components/Card";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { apiRequest, queryClient } from "@/lib/query-client";
import type { RootStackParamList, ExtractedData, DiaryData } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "AICompletion">;

type Question = {
  id: string;
  type: "scale" | "binary" | "confirm" | "quick_options";
  question: string;
  field: string;
  options?: string[];
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
          id: "fallback_emotions",
          type: "scale",
          question: "How intense were your emotions today overall?",
          field: "overall_emotion",
        },
        {
          id: "fallback_urges",
          type: "binary",
          question: "Did you experience any difficult urges today?",
          field: "had_urges",
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
          <ThemedText style={styles.emptyText}>
            Your entry looks complete!
          </ThemedText>
          <Pressable
            onPress={completeEntry}
            style={({ pressed }) => [
              styles.completeButton,
              pressed && styles.completeButtonPressed,
            ]}
          >
            <ThemedText style={styles.completeButtonText}>
              Save Entry
            </ThemedText>
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

        {question.type === "scale" && (
          <View style={styles.scaleContainer}>
            {[0, 1, 2, 3, 4, 5].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleAnswer(num)}
                style={({ pressed }) => [
                  styles.scaleButton,
                  pressed && styles.scaleButtonPressed,
                  answers[question.field] === num && styles.scaleButtonSelected,
                ]}
              >
                <ThemedText
                  style={[
                    styles.scaleText,
                    answers[question.field] === num && styles.scaleTextSelected,
                  ]}
                  fontFamily="mono"
                >
                  {num}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {question.type === "binary" && (
          <View style={styles.binaryContainer}>
            {["No", "Yes"].map((option) => (
              <Pressable
                key={option}
                onPress={() => handleAnswer(option)}
                style={({ pressed }) => [
                  styles.binaryButton,
                  pressed && styles.binaryButtonPressed,
                ]}
              >
                <ThemedText style={styles.binaryText}>{option}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {question.type === "confirm" && (
          <View style={styles.binaryContainer}>
            {["No, skip it", "Yes, log it"].map((option) => (
              <Pressable
                key={option}
                onPress={() => handleAnswer(option.includes("Yes"))}
                style={({ pressed }) => [
                  styles.binaryButton,
                  pressed && styles.binaryButtonPressed,
                ]}
              >
                <ThemedText style={styles.binaryText}>{option}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {question.type === "quick_options" && question.options && (
          <View style={styles.optionsContainer}>
            {question.options.map((option) => (
              <Pressable
                key={option}
                onPress={() => handleAnswer(option)}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionButtonPressed,
                ]}
              >
                <ThemedText style={styles.optionText}>{option}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerSpacer} />
        <ThemedText style={styles.headerTitle}>Complete Your Card</ThemedText>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <ThemedText style={styles.skipText}>Skip</ThemedText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {renderQuestion()}
      </ScrollView>

      {!isLoading && questions.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.progressDots}>
            {questions.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  index < currentStep && styles.progressDotComplete,
                ]}
              />
            ))}
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerSpacer: {
    width: 50,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  skipButton: {
    padding: Spacing.sm,
  },
  skipText: {
    color: Colors.dark.textTertiary,
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
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
    fontSize: 20,
    marginBottom: Spacing.xl,
  },
  completeButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  completeButtonPressed: {
    opacity: 0.8,
  },
  completeButtonText: {
    color: "#1a1d21",
    fontSize: 17,
    fontWeight: "600",
  },
  questionContainer: {
    alignItems: "center",
  },
  questionText: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 28,
    color: Colors.dark.text,
  },
  scaleContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  scaleButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundDefault,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  scaleButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  scaleButtonSelected: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  scaleText: {
    fontSize: 18,
    color: Colors.dark.text,
  },
  scaleTextSelected: {
    color: Colors.dark.accent,
    fontWeight: "600",
  },
  binaryContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  binaryButton: {
    backgroundColor: Colors.dark.backgroundDefault,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  binaryButtonPressed: {
    backgroundColor: Colors.dark.backgroundSecondary,
    opacity: 0.9,
  },
  binaryText: {
    fontSize: 17,
  },
  optionsContainer: {
    width: "100%",
    gap: Spacing.sm,
  },
  optionButton: {
    backgroundColor: Colors.dark.backgroundDefault,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionButtonPressed: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  optionText: {
    fontSize: 16,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  progressDots: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  progressDotActive: {
    backgroundColor: Colors.dark.accent,
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: Colors.dark.accent,
  },
});
