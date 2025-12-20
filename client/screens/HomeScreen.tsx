import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
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

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export default function HomeScreen() {
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

  const entryDates = new Set(entries.map((e) => e.date));
  const completedCount = entries.filter((e) => e.complete).length;
  const today = formatDate(new Date());

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
      <ThemedText style={styles.dateText} type="caption">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </ThemedText>

      <ThemedText style={styles.pageTitle} fontFamily="serif">
        Diary
      </ThemedText>

      <Pressable
        onPress={() => navigation.navigate("Recording")}
        style={({ pressed }) => [
          styles.recordCard,
          pressed && styles.recordCardPressed,
        ]}
      >
        <View style={styles.recordCardContent}>
          <View style={styles.recordOrbContainer}>
            <View style={styles.recordOrbOuter}>
              <View style={styles.recordOrbInner} />
            </View>
          </View>
          <View style={styles.recordTextContainer}>
            <ThemedText style={styles.recordTitle}>Record today</ThemedText>
            <ThemedText style={styles.recordSubtitle}>
              Watch your diary card fill as you speak
            </ThemedText>
          </View>
        </View>
      </Pressable>

      <View style={styles.weekContainer}>
        <ThemedText style={styles.sectionTitle} type="caption">
          This week
        </ThemedText>
        <View style={styles.weekRow}>
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date);
            const isComplete = entryDates.has(dateStr);
            const isToday = dateStr === today;
            
            return (
              <View key={dateStr} style={styles.dayColumn}>
                <ThemedText style={styles.dayLabel} type="small">
                  {dayLabels[index]}
                </ThemedText>
                <View
                  style={[
                    styles.dayBox,
                    isComplete && styles.dayBoxComplete,
                    isToday && !isComplete && styles.dayBoxToday,
                  ]}
                >
                  {isComplete ? (
                    <Feather name="check" size={14} color={theme.success} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.cardsRow}>
        <Pressable
          style={styles.featureCard}
          onPress={() => navigation.navigate("Main", { screen: "WeeklyReviewTab" })}
        >
          <ThemedText style={styles.featureCardTitle}>Week summary</ThemedText>
          <ThemedText style={styles.featureCardSubtitle}>
            {completedCount} of 7 days
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.featureCard}
          onPress={() => navigation.navigate("Main", { screen: "SessionPrepTab" })}
        >
          <ThemedText style={styles.featureCardTitle}>Session prep</ThemedText>
          <ThemedText style={styles.featureCardSubtitle}>
            Ready for therapy
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.cardsRow}>
        <Pressable
          style={styles.featureCard}
          onPress={() => navigation.navigate("SkillsLibrary")}
        >
          <ThemedText style={styles.featureCardTitle}>Skills library</ThemedText>
          <ThemedText style={styles.featureCardSubtitle}>
            32 DBT skills
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.featureCard}
          onPress={() => {}}
        >
          <ThemedText style={styles.featureCardTitle}>Notifications</ThemedText>
          <ThemedText style={styles.featureCardSubtitle}>
            Reminders
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.insightBar}>
        <ThemedText style={styles.insightText} fontFamily="serif">
          STOP appeared three times this week when anger spiked. It seems to be helping with the conflicts.
        </ThemedText>
      </View>
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
  recordCard: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundTertiary,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  recordCardPressed: {
    opacity: 0.9,
  },
  recordCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  recordOrbContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.accentMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  recordOrbOuter: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.accentMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  recordOrbInner: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.accent,
  },
  recordTextContainer: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
  },
  recordSubtitle: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },
  weekContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.dark.textTertiary,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 12,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  dayLabel: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
  },
  dayBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.backgroundTertiary,
  },
  dayBoxComplete: {
    backgroundColor: Colors.dark.backgroundTertiary,
    borderColor: Colors.dark.backgroundTertiary,
  },
  dayBoxToday: {
    borderColor: Colors.dark.accent,
    borderWidth: 1,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: 10,
    padding: Spacing.md,
  },
  featureCardTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.dark.text,
    marginBottom: 3,
  },
  featureCardSubtitle: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
  insightBar: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: 10,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.accent,
    marginTop: Spacing.sm,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
  },
});
