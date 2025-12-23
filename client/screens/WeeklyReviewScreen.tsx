import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Colors, Spacing, BorderRadius, SkillDisplayNames, EmotionColors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { DiaryEntry } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyReviewScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const theme = Colors.dark;

  const weekDates = getWeekDates();
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  const { data: entries = [] } = useQuery<DiaryEntry[]>({
    queryKey: ["/api/diary-entries", { startDate, endDate }],
  });

  const entryMap = new Map(entries.map((e) => [e.date, e]));
  const completedCount = entries.filter((e) => e.complete).length;
  const today = formatDate(new Date());

  const allEmotions: Record<string, number[]> = {};
  const allSkills: Record<string, number> = {};
  let totalUrgeIntensity = 0;
  let urgeCount = 0;

  entries.forEach((entry) => {
    if (entry.emotions) {
      Object.entries(entry.emotions).forEach(([emotion, intensity]) => {
        if (!allEmotions[emotion]) {
          allEmotions[emotion] = [];
        }
        allEmotions[emotion].push(intensity as number);
      });
    }
    if (entry.skills) {
      (entry.skills as string[]).forEach((skill) => {
        allSkills[skill] = (allSkills[skill] || 0) + 1;
      });
    }
    if (entry.urges) {
      Object.values(entry.urges).forEach((intensity) => {
        totalUrgeIntensity += intensity as number;
        urgeCount++;
      });
    }
  });

  const emotionAverages = Object.entries(allEmotions).map(([emotion, values]) => ({
    emotion,
    average: values.reduce((a, b) => a + b, 0) / values.length,
  })).sort((a, b) => b.average - a.average);

  const sortedSkills = Object.entries(allSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card elevation={1} style={styles.calendarCard}>
        <ThemedText style={styles.sectionTitle} type="caption">
          COMPLETION
        </ThemedText>
        <View style={styles.weekRow}>
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date);
            const entry = entryMap.get(dateStr);
            const isComplete = entry?.complete;
            const isToday = dateStr === today;
            
            return (
              <View key={dateStr} style={styles.dayColumn}>
                <ThemedText
                  style={[styles.dayLabel, isToday && styles.dayLabelToday]}
                  type="small"
                >
                  {dayLabels[index]}
                </ThemedText>
                <View
                  style={[
                    styles.dayCircle,
                    isComplete && styles.dayCircleComplete,
                    isToday && !isComplete && styles.dayCircleToday,
                  ]}
                >
                  {isComplete ? (
                    <Feather name="check" size={16} color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.dayNumber} fontFamily="mono">
                      {date.getDate()}
                    </ThemedText>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.completionStats}>
          <ThemedText style={styles.completionPercent} fontFamily="mono">
            {Math.round((completedCount / 7) * 100)}%
          </ThemedText>
          <ThemedText style={styles.completionLabel} type="small">
            {completedCount} of 7 days logged
          </ThemedText>
        </View>
      </Card>

      <Pressable
        onPress={() => navigation.navigate("WeeklyRecording")}
        style={({ pressed }) => [
          styles.weeklyRecordCard,
          pressed && styles.weeklyRecordCardPressed,
        ]}
      >
        <View style={styles.weeklyRecordContent}>
          <View style={styles.weeklyRecordIcon}>
            <Feather name="clipboard" size={20} color={Colors.dark.accent} />
          </View>
          <View style={styles.weeklyRecordText}>
            <ThemedText style={styles.weeklyRecordTitle}>
              Weekly Check-In
            </ThemedText>
            <ThemedText style={styles.weeklyRecordSubtitle}>
              Pre-session ratings and weekly sections
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={Colors.dark.textTertiary} />
        </View>
      </Pressable>

      {emotionAverages.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            EMOTION AVERAGES
          </ThemedText>
          <View style={styles.emotionList}>
            {emotionAverages.map(({ emotion, average }) => (
              <View key={emotion} style={styles.emotionRow}>
                <View
                  style={[
                    styles.emotionDot,
                    { backgroundColor: EmotionColors[emotion as keyof typeof EmotionColors] || theme.textSecondary },
                  ]}
                />
                <ThemedText style={styles.emotionName}>
                  {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                </ThemedText>
                <View style={styles.emotionBar}>
                  <View
                    style={[
                      styles.emotionBarFill,
                      {
                        width: `${(average / 5) * 100}%`,
                        backgroundColor: EmotionColors[emotion as keyof typeof EmotionColors] || theme.textSecondary,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.emotionValue} fontFamily="mono">
                  {average.toFixed(1)}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {sortedSkills.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            SKILLS USED
          </ThemedText>
          <View style={styles.skillList}>
            {sortedSkills.map(([skill, count]) => (
              <View key={skill} style={styles.skillRow}>
                <View style={styles.skillChip}>
                  <ThemedText style={styles.skillText}>
                    {SkillDisplayNames[skill] || skill}
                  </ThemedText>
                </View>
                <ThemedText style={styles.skillCount} fontFamily="mono">
                  {count}x
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {urgeCount > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            URGE SUMMARY
          </ThemedText>
          <View style={styles.urgeSummary}>
            <ThemedText style={styles.urgeAverage} fontFamily="mono">
              {(totalUrgeIntensity / urgeCount).toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.urgeLabel} type="small">
              average urge intensity
            </ThemedText>
          </View>
        </Card>
      )}

      {entries.length === 0 && (
        <Card elevation={1} style={styles.emptyCard}>
          <Feather name="calendar" size={48} color={theme.textTertiary} />
          <ThemedText style={styles.emptyText} type="body">
            No entries this week yet
          </ThemedText>
          <ThemedText style={styles.emptySubtext} type="caption">
            Start recording to see your weekly patterns
          </ThemedText>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
  },
  dayLabel: {
    color: Colors.dark.textTertiary,
    marginBottom: Spacing.xs,
  },
  dayLabelToday: {
    color: Colors.dark.accent,
    fontWeight: "600",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dayCircleComplete: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  dayCircleToday: {
    borderColor: Colors.dark.accent,
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    color: Colors.dark.textTertiary,
  },
  completionStats: {
    alignItems: "center",
  },
  completionPercent: {
    fontSize: 32,
    color: Colors.dark.accent,
    fontWeight: "600",
  },
  completionLabel: {
    color: Colors.dark.textSecondary,
  },
  weeklyRecordCard: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  weeklyRecordCardPressed: {
    opacity: 0.8,
  },
  weeklyRecordContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  weeklyRecordIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.accentMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  weeklyRecordText: {
    flex: 1,
  },
  weeklyRecordTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
  },
  weeklyRecordSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  emotionList: {
    gap: Spacing.md,
  },
  emotionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emotionDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  emotionName: {
    width: 80,
  },
  emotionBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.xs,
    marginHorizontal: Spacing.sm,
    overflow: "hidden",
  },
  emotionBarFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
  },
  emotionValue: {
    width: 32,
    textAlign: "right",
    color: Colors.dark.textSecondary,
  },
  skillList: {
    gap: Spacing.sm,
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skillChip: {
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  skillText: {
    color: Colors.dark.accent,
    fontSize: 14,
  },
  skillCount: {
    color: Colors.dark.textSecondary,
  },
  urgeSummary: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  urgeAverage: {
    fontSize: 36,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  urgeLabel: {
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    color: Colors.dark.textSecondary,
  },
  emptySubtext: {
    color: Colors.dark.textTertiary,
    marginTop: Spacing.xs,
  },
});
