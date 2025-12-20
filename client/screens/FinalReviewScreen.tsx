import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
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
    return EmotionColors[emotion as keyof typeof EmotionColors] || theme.textSecondary;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.successIcon}>
          <Feather name="check-circle" size={64} color={theme.accent} />
        </View>

        <ThemedText style={styles.title} type="headline">
          Entry Complete
        </ThemedText>
        <ThemedText style={styles.subtitle} type="caption">
          Your diary card has been saved
        </ThemedText>

        {Object.keys(diaryData.emotions).length > 0 && (
          <Card elevation={1} style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="caption">
              EMOTIONS
            </ThemedText>
            <View style={styles.emotionList}>
              {Object.entries(diaryData.emotions).map(([emotion, intensity]) => (
                <View key={emotion} style={styles.emotionItem}>
                  <View
                    style={[
                      styles.emotionDot,
                      { backgroundColor: getEmotionColor(emotion) },
                    ]}
                  />
                  <ThemedText style={styles.emotionName}>
                    {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                  </ThemedText>
                  <ThemedText style={styles.emotionIntensity} fontFamily="mono">
                    {intensity}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {Object.keys(diaryData.urges).length > 0 && (
          <Card elevation={1} style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="caption">
              URGES
            </ThemedText>
            <View style={styles.urgeList}>
              {Object.entries(diaryData.urges).map(([urge, intensity]) => (
                <View key={urge} style={styles.urgeItem}>
                  <ThemedText style={styles.urgeName}>
                    {urge.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </ThemedText>
                  <ThemedText style={styles.urgeIntensity} fontFamily="mono">
                    {intensity}
                  </ThemedText>
                </View>
              ))}
            </View>
            {diaryData.actedOnUrges ? (
              <ThemedText style={styles.actedOnUrges}>
                Acted on urges today
              </ThemedText>
            ) : (
              <ThemedText style={styles.notActedOnUrges}>
                Did not act on urges
              </ThemedText>
            )}
          </Card>
        )}

        {diaryData.skills.length > 0 && (
          <Card elevation={1} style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="caption">
              SKILLS USED
            </ThemedText>
            <View style={styles.skillList}>
              {diaryData.skills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <ThemedText style={styles.skillText}>
                    {SkillDisplayNames[skill] || skill}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {diaryData.context.promptingEvents.length > 0 && (
          <Card elevation={1} style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="caption">
              CONTEXT
            </ThemedText>
            {diaryData.context.promptingEvents.map((event, index) => (
              <ThemedText key={index} style={styles.contextItem} fontFamily="serif">
                {event}
              </ThemedText>
            ))}
          </Card>
        )}

        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.doneButton,
            pressed && styles.doneButtonPressed,
          ]}
        >
          <ThemedText style={styles.doneButtonText}>Done</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xl,
  },
  section: {
    width: "100%",
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  emotionList: {
    gap: Spacing.sm,
  },
  emotionItem: {
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
    flex: 1,
  },
  emotionIntensity: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  urgeList: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  urgeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  urgeName: {
    flex: 1,
  },
  urgeIntensity: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  actedOnUrges: {
    color: Colors.dark.emotions.anger,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  notActedOnUrges: {
    color: Colors.dark.emotions.joy,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  skillList: {
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
  contextItem: {
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
    fontSize: 16,
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  doneButtonPressed: {
    opacity: 0.8,
  },
  doneButtonText: {
    color: "#1a1d21",
    fontSize: 17,
    fontWeight: "600",
  },
});
