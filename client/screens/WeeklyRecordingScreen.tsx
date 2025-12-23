import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { WeeklySessionData } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SESSION_URGES = [
  { id: "quit_therapy", label: "Urge to quit therapy" },
  { id: "use_drugs", label: "Urge to use drugs" },
  { id: "suicide", label: "Urge to commit suicide" },
];

const BELIEFS = [
  { id: "regulate_emotions", label: "Belief I can regulate emotions" },
  { id: "regulate_actions", label: "Belief I can regulate actions" },
  { id: "regulate_thoughts", label: "Belief I can regulate thoughts" },
];

function RatingSelector({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (val: number) => void;
  label: string;
}) {
  const theme = Colors.dark;
  
  return (
    <View style={styles.ratingRow}>
      <ThemedText style={styles.ratingLabel}>{label}</ThemedText>
      <View style={styles.ratingButtons}>
        {[0, 1, 2, 3, 4, 5].map((num) => (
          <Pressable
            key={num}
            onPress={() => onChange(num)}
            style={[
              styles.ratingButton,
              value === num && styles.ratingButtonActive,
            ]}
          >
            <ThemedText
              style={[
                styles.ratingButtonText,
                value === num && styles.ratingButtonTextActive,
              ]}
              fontFamily="mono"
            >
              {num}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
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

export default function WeeklyRecordingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const theme = Colors.dark;
  const { start, end, weekEndDate } = getWeekDateRange();

  const [sessionUrges, setSessionUrges] = useState<Record<string, number>>({});
  const [beliefs, setBeliefs] = useState<Record<string, number>>({});
  const [medChanges, setMedChanges] = useState("");
  const [homework, setHomework] = useState("");
  const [skillsFocus, setSkillsFocus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    setIsSaving(true);
    const weeklyData: WeeklySessionData = {
      sessionUrges,
      beliefToRegulate: beliefs,
      medChanges: medChanges.trim() || undefined,
      homework: homework.trim() || undefined,
      skillsFocus: skillsFocus.trim() || undefined,
    };
    
    try {
      await saveMutation.mutateAsync(weeklyData);
    } finally {
      setIsSaving(false);
    }
  };

  const isComplete = Object.keys(sessionUrges).length >= 3 && Object.keys(beliefs).length >= 3;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>Weekly Check-In</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{start} - {end}</ThemedText>
        </View>
        <Pressable
          onPress={isComplete ? handleSave : undefined}
          disabled={isSaving || !isComplete}
          style={[styles.saveButton, (!isComplete || isSaving) && styles.saveButtonDisabled]}
        >
          <ThemedText style={[styles.saveButtonText, !isComplete && styles.saveButtonTextDisabled]}>
            {isSaving ? "Saving..." : "Save"}
          </ThemedText>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            SESSION TRACKING (0-5)
          </ThemedText>
          <ThemedText style={styles.sectionDescription} type="small">
            Rate your current state coming into session
          </ThemedText>
          
          {SESSION_URGES.map((urge) => (
            <RatingSelector
              key={urge.id}
              label={urge.label}
              value={sessionUrges[urge.id] ?? null}
              onChange={(val) => setSessionUrges((prev) => ({ ...prev, [urge.id]: val }))}
            />
          ))}
        </Card>

        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            BELIEFS ABOUT SELF-REGULATION (0-5)
          </ThemedText>
          <ThemedText style={styles.sectionDescription} type="small">
            Rate your confidence in your ability to regulate
          </ThemedText>
          
          {BELIEFS.map((belief) => (
            <RatingSelector
              key={belief.id}
              label={belief.label}
              value={beliefs[belief.id] ?? null}
              onChange={(val) => setBeliefs((prev) => ({ ...prev, [belief.id]: val }))}
            />
          ))}
        </Card>

        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            WEEKLY SECTIONS
          </ThemedText>
          
          <View style={styles.textInputGroup}>
            <ThemedText style={styles.inputLabel}>
              Medication changes this week
            </ThemedText>
            <TextInput
              style={styles.textInput}
              value={medChanges}
              onChangeText={setMedChanges}
              placeholder="Any changes to your medications?"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.textInputGroup}>
            <ThemedText style={styles.inputLabel}>
              Homework assigned and results
            </ThemedText>
            <TextInput
              style={styles.textInput}
              value={homework}
              onChangeText={setHomework}
              placeholder="What homework was assigned and what were your results?"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.textInputGroup}>
            <ThemedText style={styles.inputLabel}>
              Skills focus this week
            </ThemedText>
            <TextInput
              style={styles.textInput}
              value={skillsFocus}
              onChangeText={setSkillsFocus}
              placeholder="What skills did you focus on or want to focus on?"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.md,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark.backgroundRoot,
  },
  saveButtonTextDisabled: {
    color: Colors.dark.textTertiary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  ratingRow: {
    marginBottom: Spacing.lg,
  },
  ratingLabel: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  ratingButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  ratingButton: {
    flex: 1,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ratingButtonActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  ratingButtonText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  ratingButtonTextActive: {
    color: Colors.dark.backgroundRoot,
    fontWeight: "600",
  },
  textInputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.dark.text,
    minHeight: 60,
    textAlignVertical: "top",
  },
});
