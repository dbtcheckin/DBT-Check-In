import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Colors, Spacing, BorderRadius, SkillDisplayNames, EmotionColors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { DiaryEntry } from "@shared/schema";

type RouteProps = RouteProp<RootStackParamList, "DiaryEntryDetail">;

export default function DiaryEntryDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<RouteProps>();
  const { date } = route.params;
  const theme = Colors.dark;

  const { data: entries = [] } = useQuery<DiaryEntry[]>({
    queryKey: ["/api/diary-entries", { startDate: date, endDate: date }],
  });

  const entry = entries.find((e) => e.date === date);

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const parseTranscript = (transcript: string | null | undefined) => {
    if (!transcript) return [];
    const lines = transcript.split("\n").filter((line) => line.trim());
    return lines.map((line, index) => {
      const isUser = line.toLowerCase().startsWith("user:") || line.toLowerCase().startsWith("you:");
      const isAI = line.toLowerCase().startsWith("ai:") || line.toLowerCase().startsWith("assistant:");
      let text = line;
      let role: "user" | "ai" | "system" = "system";
      
      if (isUser) {
        text = line.replace(/^(user|you):\s*/i, "");
        role = "user";
      } else if (isAI) {
        text = line.replace(/^(ai|assistant):\s*/i, "");
        role = "ai";
      }
      
      return { id: index, role, text };
    });
  };

  const messages = parseTranscript(entry?.transcript);

  if (!entry) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <Card elevation={1} style={styles.emptyCard}>
          <Feather name="calendar" size={48} color={theme.textTertiary} />
          <ThemedText style={styles.emptyText} type="body">
            No entry for this day
          </ThemedText>
        </Card>
      </ScrollView>
    );
  }

  const emotions = entry.emotions || {};
  const urges = entry.urges || {};
  const skills = (entry.skills || []) as string[];
  const behaviors = entry.behaviors || {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <ThemedText style={styles.dateText} type="caption">
        {formattedDate}
      </ThemedText>

      <ThemedText style={styles.pageTitle} fontFamily="serif">
        Diary Card
      </ThemedText>

      {Object.keys(emotions).length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            EMOTIONS
          </ThemedText>
          <View style={styles.dataList}>
            {Object.entries(emotions).map(([emotion, intensity]) => (
              <View key={emotion} style={styles.dataRow}>
                <View
                  style={[
                    styles.emotionDot,
                    { backgroundColor: EmotionColors[emotion as keyof typeof EmotionColors] || theme.textSecondary },
                  ]}
                />
                <ThemedText style={styles.dataLabel}>
                  {emotion.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </ThemedText>
                <View style={styles.intensityBar}>
                  <View
                    style={[
                      styles.intensityFill,
                      {
                        width: `${((intensity as number) / 5) * 100}%`,
                        backgroundColor: EmotionColors[emotion as keyof typeof EmotionColors] || theme.accent,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.dataValue} fontFamily="mono">
                  {intensity as number}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {Object.keys(urges).length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            URGES
          </ThemedText>
          <View style={styles.dataList}>
            {Object.entries(urges).map(([urge, intensity]) => (
              <View key={urge} style={styles.dataRow}>
                <View style={[styles.emotionDot, { backgroundColor: theme.danger }]} />
                <ThemedText style={styles.dataLabel}>
                  {urge.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </ThemedText>
                <View style={styles.intensityBar}>
                  <View
                    style={[
                      styles.intensityFill,
                      {
                        width: `${((intensity as number) / 5) * 100}%`,
                        backgroundColor: theme.danger,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.dataValue} fontFamily="mono">
                  {intensity as number}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {skills.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            SKILLS USED
          </ThemedText>
          <View style={styles.skillsGrid}>
            {skills.map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <ThemedText style={styles.skillText}>
                  {SkillDisplayNames[skill] || skill}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {Object.keys(behaviors).length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            BEHAVIORS
          </ThemedText>
          <View style={styles.dataList}>
            {Object.entries(behaviors).map(([behavior, value]) => (
              <View key={behavior} style={styles.behaviorRow}>
                <Feather
                  name={value ? "check-circle" : "x-circle"}
                  size={18}
                  color={value ? theme.success : theme.textTertiary}
                />
                <ThemedText style={styles.behaviorLabel}>
                  {behavior.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {messages.length > 0 && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            CONVERSATION
          </ThemedText>
          <View style={styles.transcriptContainer}>
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === "user" ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <ThemedText style={styles.messageRole} type="small">
                  {msg.role === "user" ? "You" : "AI"}
                </ThemedText>
                <ThemedText style={styles.messageText}>{msg.text}</ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {messages.length === 0 && !entry.transcript && (
        <Card elevation={1} style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="caption">
            CONVERSATION
          </ThemedText>
          <View style={styles.noTranscript}>
            <Feather name="message-circle" size={24} color={theme.textTertiary} />
            <ThemedText style={styles.noTranscriptText} type="small">
              No conversation recorded for this entry
            </ThemedText>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateText: {
    color: Colors.dark.textTertiary,
    marginBottom: Spacing.xs,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "400",
    color: Colors.dark.text,
    marginBottom: Spacing.lg,
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
  dataList: {
    gap: Spacing.md,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emotionDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  dataLabel: {
    flex: 1,
    color: Colors.dark.text,
  },
  intensityBar: {
    width: 80,
    height: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.xs,
    marginHorizontal: Spacing.sm,
    overflow: "hidden",
  },
  intensityFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
  },
  dataValue: {
    width: 24,
    textAlign: "right",
    color: Colors.dark.textSecondary,
  },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
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
  behaviorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  behaviorLabel: {
    color: Colors.dark.text,
  },
  transcriptContainer: {
    gap: Spacing.md,
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    maxWidth: "90%",
  },
  userBubble: {
    backgroundColor: Colors.dark.accentMuted,
    alignSelf: "flex-end",
    borderBottomRightRadius: BorderRadius.xs,
  },
  aiBubble: {
    backgroundColor: Colors.dark.backgroundSecondary,
    alignSelf: "flex-start",
    borderBottomLeftRadius: BorderRadius.xs,
  },
  messageRole: {
    color: Colors.dark.textTertiary,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
  },
  messageText: {
    color: Colors.dark.text,
    lineHeight: 22,
  },
  noTranscript: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  noTranscriptText: {
    color: Colors.dark.textTertiary,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    color: Colors.dark.textSecondary,
  },
});
