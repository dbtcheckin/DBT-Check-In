import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Colors, Spacing, BorderRadius, SkillDisplayNames, EmotionColors } from "@/constants/theme";
import type { DiaryEntry } from "@shared/schema";

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

export default function SessionPrepScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = Colors.dark;

  const weekDates = getWeekDates();
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  const { data: entries = [] } = useQuery<DiaryEntry[]>({
    queryKey: ["/api/diary-entries", { startDate, endDate }],
  });

  const completedCount = entries.filter((e) => e.complete).length;

  const allEmotions: Record<string, number[]> = {};
  const allSkills: Record<string, number> = {};
  const allUrges: Record<string, number[]> = {};
  const promptingEvents: string[] = [];
  let actedOnUrgesCount = 0;

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
      Object.entries(entry.urges).forEach(([urge, intensity]) => {
        if (!allUrges[urge]) {
          allUrges[urge] = [];
        }
        allUrges[urge].push(intensity as number);
      });
    }
    if (entry.context) {
      const context = entry.context as { promptingEvents?: string[] };
      if (context.promptingEvents) {
        promptingEvents.push(...context.promptingEvents);
      }
    }
    if (entry.actedOnUrges) {
      actedOnUrgesCount++;
    }
  });

  const emotionSummary = Object.entries(allEmotions)
    .map(([emotion, values]) => ({
      emotion,
      max: Math.max(...values),
      average: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 3);

  const urgeSummary = Object.entries(allUrges)
    .map(([urge, values]) => ({
      urge,
      max: Math.max(...values),
      average: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .filter((u) => u.max >= 2);

  const topSkills = Object.entries(allSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const discussionTopics: string[] = [];
  
  if (emotionSummary.some((e) => e.max >= 4)) {
    discussionTopics.push("High-intensity emotions this week");
  }
  if (urgeSummary.some((u) => u.max >= 3)) {
    discussionTopics.push("Elevated urges to discuss");
  }
  if (actedOnUrgesCount > 0) {
    discussionTopics.push(`Acted on urges ${actedOnUrgesCount} time(s)`);
  }
  if (completedCount < 5) {
    discussionTopics.push("Diary card completion challenges");
  }
  if (topSkills.length > 3) {
    discussionTopics.push("Review skill effectiveness");
  }

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
      <Card elevation={1} style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Feather
            name={completedCount >= 5 ? "check-circle" : "alert-circle"}
            size={24}
            color={completedCount >= 5 ? theme.accent : Colors.dark.emotions.anxiety}
          />
          <ThemedText style={styles.statusTitle}>
            {completedCount >= 5 ? "Ready for Session" : "Incomplete Week"}
          </ThemedText>
        </View>
        <ThemedText style={styles.statusText} type="caption">
          {completedCount}/7 diary cards completed
        </ThemedText>
      </Card>

      {emotionSummary.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            EMOTION SUMMARY
          </ThemedText>
          {emotionSummary.map(({ emotion, max, average }) => (
            <View key={emotion} style={styles.summaryRow}>
              <View
                style={[
                  styles.emotionDot,
                  { backgroundColor: EmotionColors[emotion as keyof typeof EmotionColors] || theme.textSecondary },
                ]}
              />
              <ThemedText style={styles.summaryLabel}>
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </ThemedText>
              <ThemedText style={styles.summaryValue} fontFamily="mono">
                avg {average.toFixed(1)} / max {max}
              </ThemedText>
            </View>
          ))}
        </Card>
      )}

      {urgeSummary.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            URGE SUMMARY
          </ThemedText>
          {urgeSummary.map(({ urge, max, average }) => (
            <View key={urge} style={styles.summaryRow}>
              <Feather
                name="alert-triangle"
                size={14}
                color={max >= 4 ? Colors.dark.emotions.anger : Colors.dark.emotions.anxiety}
                style={{ marginRight: Spacing.sm }}
              />
              <ThemedText style={styles.summaryLabel}>
                {urge.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </ThemedText>
              <ThemedText style={styles.summaryValue} fontFamily="mono">
                avg {average.toFixed(1)} / max {max}
              </ThemedText>
            </View>
          ))}
          {actedOnUrgesCount > 0 && (
            <ThemedText style={styles.actedNote}>
              Acted on urges {actedOnUrgesCount} day(s)
            </ThemedText>
          )}
        </Card>
      )}

      {topSkills.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            SKILLS USED ({Object.keys(allSkills).length} total)
          </ThemedText>
          <View style={styles.skillList}>
            {topSkills.map(([skill, count]) => (
              <View key={skill} style={styles.skillItem}>
                <ThemedText style={styles.skillName}>
                  {SkillDisplayNames[skill] || skill}
                </ThemedText>
                <ThemedText style={styles.skillCount} fontFamily="mono">
                  {count}x
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {discussionTopics.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            SUGGESTED DISCUSSION TOPICS
          </ThemedText>
          {discussionTopics.map((topic, index) => (
            <View key={index} style={styles.topicRow}>
              <View style={styles.topicBullet} />
              <ThemedText style={styles.topicText} fontFamily="serif">
                {topic}
              </ThemedText>
            </View>
          ))}
        </Card>
      )}

      {promptingEvents.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            KEY EVENTS
          </ThemedText>
          {promptingEvents.slice(0, 5).map((event, index) => (
            <ThemedText
              key={index}
              style={styles.eventText}
              fontFamily="serif"
              numberOfLines={2}
            >
              {event}
            </ThemedText>
          ))}
        </Card>
      )}

      {entries.length === 0 && (
        <Card elevation={1} style={styles.emptyCard}>
          <Feather name="clipboard" size={48} color={theme.textTertiary} />
          <ThemedText style={styles.emptyText} type="body">
            No entries this week yet
          </ThemedText>
          <ThemedText style={styles.emptySubtext} type="caption">
            Start recording to prepare for your session
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
  statusCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  statusTitle: {
    marginLeft: Spacing.sm,
    fontSize: 18,
    fontWeight: "600",
  },
  statusText: {
    color: Colors.dark.textSecondary,
    marginLeft: 32,
  },
  section: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emotionDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  summaryLabel: {
    flex: 1,
  },
  summaryValue: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  actedNote: {
    color: Colors.dark.emotions.anger,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  skillList: {
    gap: Spacing.sm,
  },
  skillItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillName: {
    color: Colors.dark.accent,
  },
  skillCount: {
    color: Colors.dark.textSecondary,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  topicBullet: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.accent,
    marginRight: Spacing.sm,
    marginTop: 8,
  },
  topicText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  eventText: {
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
    fontSize: 15,
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
