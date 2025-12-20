import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
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
  const todayEntry = entries.find((e) => e.date === today);

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

      <Pressable
        onPress={() => navigation.navigate("Recording")}
        style={({ pressed }) => [
          styles.recordCard,
          pressed && styles.recordCardPressed,
        ]}
      >
        <LinearGradient
          colors={[theme.accentGradientStart, "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recordCardGradient}
        >
          <View style={styles.recordIconContainer}>
            <Feather name="mic" size={40} color="#ffffff" />
          </View>
          <ThemedText style={styles.recordTitle} type="title">
            {todayEntry ? "Update Today's Entry" : "Record Today's Entry"}
          </ThemedText>
          <ThemedText style={styles.recordSubtitle} type="caption">
            Speak freely - I'll help complete it
          </ThemedText>
        </LinearGradient>
      </Pressable>

      <View style={styles.weekContainer}>
        <ThemedText style={styles.sectionTitle} type="caption">
          This Week
        </ThemedText>
        <View style={styles.weekRow}>
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date);
            const isComplete = entryDates.has(dateStr);
            const isToday = dateStr === today;
            
            return (
              <View key={dateStr} style={styles.dayColumn}>
                <ThemedText
                  style={[
                    styles.dayLabel,
                    isToday && styles.dayLabelToday,
                  ]}
                  type="small"
                >
                  {dayLabels[index]}
                </ThemedText>
                <View
                  style={[
                    styles.dayDot,
                    isComplete && styles.dayDotComplete,
                    isToday && !isComplete && styles.dayDotToday,
                  ]}
                >
                  {isComplete ? (
                    <Feather name="check" size={12} color="#ffffff" />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <ThemedText style={styles.weekSummary} type="small" fontFamily="mono">
          {completedCount}/7 days logged
        </ThemedText>
      </View>

      <View style={styles.quickActions}>
        <Card
          elevation={1}
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("Main", { screen: "WeeklyReviewTab" })}
        >
          <View style={styles.quickActionIcon}>
            <Feather name="bar-chart-2" size={24} color={theme.accent} />
          </View>
          <ThemedText style={styles.quickActionTitle} type="body">
            Weekly Review
          </ThemedText>
          <ThemedText style={styles.quickActionSubtitle} type="small">
            {completedCount}/7 days logged
          </ThemedText>
        </Card>

        <Card
          elevation={1}
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("Main", { screen: "SessionPrepTab" })}
        >
          <View style={styles.quickActionIcon}>
            <Feather name="clipboard" size={24} color={theme.accent} />
          </View>
          <ThemedText style={styles.quickActionTitle} type="body">
            Session Prep
          </ThemedText>
          <ThemedText style={styles.quickActionSubtitle} type="small">
            Ready for therapy
          </ThemedText>
        </Card>
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
    marginBottom: Spacing.lg,
  },
  recordCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  recordCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  recordCardGradient: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  recordIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  recordTitle: {
    color: "#ffffff",
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  recordSubtitle: {
    color: "rgba(255,255,255,0.7)",
  },
  weekContainer: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.dark.textTertiary,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
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
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dayDotComplete: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  dayDotToday: {
    borderColor: Colors.dark.accent,
    borderWidth: 2,
  },
  weekSummary: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    padding: Spacing.lg,
  },
  quickActionIcon: {
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  quickActionSubtitle: {
    color: Colors.dark.textTertiary,
  },
});
