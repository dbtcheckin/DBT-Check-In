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
  { id: "quit_therapy", label: "Quit Therapy" },
  { id: "use_drugs", label: "Use Drugs" },
  { id: "suicide", label: "Suicide" },
];

const BELIEFS = [
  { id: "regulate_emotions", label: "Emotions" },
  { id: "regulate_actions", label: "Actions" },
  { id: "regulate_thoughts", label: "Thoughts" },
];

function InlineRatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
}) {
  return (
    <View style={styles.inlineRow}>
      <ThemedText style={styles.inlineLabel}>{label}</ThemedText>
      <View style={styles.inlineValue}>
        <ThemedText style={styles.valueText} fontFamily="mono">
          {value !== null ? value : "-"}
        </ThemedText>
      </View>
    </View>
  );
}

function RatingSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
}) {
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
  const [transcript, setTranscript] = useState("");

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
    if (!isComplete) return;
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

  const handleStartRecording = () => {
    // TODO: Implement voice recording for weekly entries
    // For now, this is a placeholder that shows recording is available
  };

  const isComplete = Object.keys(sessionUrges).length >= 3 && Object.keys(beliefs).length >= 3;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </Pressable>
        <ThemedText style={styles.timerText} fontFamily="mono">0:00</ThemedText>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        <Card elevation={1} style={styles.titleCard}>
          <ThemedText style={styles.cardTitle} fontFamily="mono">
            WEEKLY DIARY CARD - {start.toUpperCase()} TO {end.toUpperCase()}
          </ThemedText>
        </Card>

        <View style={styles.twoColumnSection}>
          <View style={styles.column}>
            <ThemedText style={styles.columnHeader} type="caption">
              SESSION URGES (0-5)
            </ThemedText>
            {SESSION_URGES.map((urge) => (
              <InlineRatingRow
                key={urge.id}
                label={urge.label}
                value={sessionUrges[urge.id] ?? null}
                onChange={(val) => setSessionUrges((prev) => ({ ...prev, [urge.id]: val }))}
              />
            ))}
          </View>
          <View style={styles.column}>
            <ThemedText style={styles.columnHeader} type="caption">
              BELIEFS (0-5)
            </ThemedText>
            {BELIEFS.map((belief) => (
              <InlineRatingRow
                key={belief.id}
                label={belief.label}
                value={beliefs[belief.id] ?? null}
                onChange={(val) => setBeliefs((prev) => ({ ...prev, [belief.id]: val }))}
              />
            ))}
          </View>
        </View>

        <Card elevation={1} style={styles.ratingsCard}>
          <ThemedText style={styles.sectionTitle} type="caption">
            TAP TO SET RATINGS
          </ThemedText>
          
          <ThemedText style={styles.subsectionTitle}>Session Urges</ThemedText>
          {SESSION_URGES.map((urge) => (
            <RatingSelector
              key={urge.id}
              label={urge.label}
              value={sessionUrges[urge.id] ?? null}
              onChange={(val) => setSessionUrges((prev) => ({ ...prev, [urge.id]: val }))}
            />
          ))}

          <ThemedText style={[styles.subsectionTitle, { marginTop: Spacing.md }]}>Beliefs</ThemedText>
          {BELIEFS.map((belief) => (
            <RatingSelector
              key={belief.id}
              label={belief.label}
              value={beliefs[belief.id] ?? null}
              onChange={(val) => setBeliefs((prev) => ({ ...prev, [belief.id]: val }))}
            />
          ))}
        </Card>

        <Card elevation={1} style={styles.weeklySectionsCard}>
          <ThemedText style={styles.sectionTitle} type="caption">
            WEEKLY SECTIONS
          </ThemedText>
          
          <View style={styles.textInputGroup}>
            <ThemedText style={styles.inputLabel}>Medication Changes</ThemedText>
            <TextInput
              style={styles.textInput}
              value={medChanges}
              onChangeText={setMedChanges}
              placeholder="Any changes to your medications?"
              placeholderTextColor={theme.textTertiary}
              multiline
            />
          </View>

          <View style={styles.textInputGroup}>
            <ThemedText style={styles.inputLabel}>Homework</ThemedText>
            <TextInput
              style={styles.textInput}
              value={homework}
              onChangeText={setHomework}
              placeholder="Assigned and results"
              placeholderTextColor={theme.textTertiary}
              multiline
            />
          </View>

          <View style={styles.textInputGroup}>
            <ThemedText style={styles.inputLabel}>Skills Focus</ThemedText>
            <TextInput
              style={styles.textInput}
              value={skillsFocus}
              onChangeText={setSkillsFocus}
              placeholder="Skills to focus on this week"
              placeholderTextColor={theme.textTertiary}
              multiline
            />
          </View>
        </Card>

        <View style={styles.transcriptArea}>
          <ThemedText style={styles.transcriptPlaceholder} fontFamily="serif">
            Speak about your week...
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleStartRecording}
          style={({ pressed }) => [
            styles.recordButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <View style={styles.buttonContent}>
            <Feather name="mic" size={18} color={theme.text} />
            <ThemedText style={styles.recordButtonText}>Start Recording</ThemedText>
          </View>
        </Pressable>

        {isComplete ? (
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveButtonSmall,
              pressed && styles.buttonPressed,
              isSaving && styles.buttonDisabled,
            ]}
          >
            <View style={styles.buttonContent}>
              <Feather name="check" size={16} color={Colors.dark.backgroundRoot} />
              <ThemedText style={styles.saveButtonText}>
                {isSaving ? "Saving..." : "Save"}
              </ThemedText>
            </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  timerText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },
  titleCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
  },
  twoColumnSection: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  column: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  columnHeader: {
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 9,
    marginBottom: Spacing.xs,
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  inlineLabel: {
    fontSize: 12,
    color: Colors.dark.text,
  },
  inlineValue: {
    minWidth: 24,
    alignItems: "flex-end",
  },
  valueText: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
  ratingsCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 10,
    marginBottom: Spacing.sm,
  },
  subsectionTitle: {
    fontSize: 13,
    color: Colors.dark.accent,
    marginBottom: Spacing.xs,
  },
  ratingRow: {
    marginBottom: Spacing.sm,
  },
  ratingLabel: {
    fontSize: 13,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  ratingButtons: {
    flexDirection: "row",
    gap: 6,
  },
  ratingButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ratingButtonActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  ratingButtonText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  ratingButtonTextActive: {
    color: Colors.dark.backgroundRoot,
    fontWeight: "600",
  },
  weeklySectionsCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  textInputGroup: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.dark.text,
    minHeight: 44,
    textAlignVertical: "top",
  },
  transcriptArea: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 60,
  },
  transcriptPlaceholder: {
    color: Colors.dark.textTertiary,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: Spacing.md,
    backgroundColor: Colors.dark.backgroundRoot,
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
  saveButtonSmall: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.backgroundRoot,
  },
});
