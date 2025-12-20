import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius, SkillDisplayNames, EmotionColors } from "@/constants/theme";
import type { RootStackParamList, DiaryData } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "FinalReview">;

export default function FinalReviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const theme = Colors.dark;

  const { diaryData } = route.params;

  const handleDone = () => {
    navigation.popToTop();
    navigation.navigate("Main");
  };

  const getEmotionColor = (emotion: string) => {
    return EmotionColors[emotion as keyof typeof EmotionColors] || theme.accent;
  };

  const hasEmotions = Object.keys(diaryData.emotions).length > 0;
  const hasUrges = Object.keys(diaryData.urges).length > 0;
  const hasSkills = diaryData.skills.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleDone} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={theme.textSecondary} />
        </Pressable>
        <ThemedText style={styles.headerTitle} fontFamily="serif">
          Review
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.capturedSection}>
          <ThemedText style={styles.sectionLabel}>
            Captured from your entry
          </ThemedText>

          {hasEmotions ? (
            <View style={styles.dataGroup}>
              <ThemedText style={styles.groupLabel}>Emotions</ThemedText>
              <View style={styles.chipRow}>
                {Object.entries(diaryData.emotions).map(([emotion, intensity]) => (
                  <View key={emotion} style={styles.chip}>
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: getEmotionColor(emotion) },
                      ]}
                    />
                    <ThemedText style={styles.chipLabel}>
                      {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                    </ThemedText>
                    <ThemedText style={styles.chipValue} fontFamily="mono">
                      {intensity}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {hasUrges ? (
            <View style={styles.dataGroup}>
              <ThemedText style={styles.groupLabel}>Urges</ThemedText>
              <View style={styles.chipRow}>
                {Object.entries(diaryData.urges).map(([urge, intensity]) => (
                  <View key={urge} style={styles.chip}>
                    <ThemedText style={styles.chipLabel}>
                      {urge.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </ThemedText>
                    <ThemedText style={styles.chipValue} fontFamily="mono">
                      {intensity}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {hasSkills ? (
            <View style={styles.dataGroup}>
              <ThemedText style={styles.groupLabel}>Skills Used</ThemedText>
              <View style={styles.chipRow}>
                {diaryData.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <ThemedText style={styles.skillChipText}>
                      {SkillDisplayNames[skill] || skill}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <ThemedText style={styles.saveButtonText}>Save Entry</ThemedText>
        </Pressable>
      </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 10,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "400",
    color: Colors.dark.text,
  },
  headerSpacer: {
    width: 28,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  capturedSection: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  dataGroup: {
    marginBottom: 14,
  },
  groupLabel: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundTertiary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    gap: 6,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  chipLabel: {
    fontSize: 12,
    color: Colors.dark.text,
  },
  chipValue: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  skillChip: {
    backgroundColor: Colors.dark.accentMuted,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.dark.accentGlow,
  },
  skillChipText: {
    fontSize: 12,
    color: Colors.dark.accent,
  },
  saveButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: Colors.dark.backgroundRoot,
    fontSize: 15,
    fontWeight: "500",
  },
});
