import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const SKILLS_DATA = {
  mindfulness: {
    title: "Mindfulness",
    skills: [
      { id: "wise_mind", label: "Wise Mind", description: "Balance emotion mind and reasonable mind" },
      { id: "observe", label: "Observe", description: "Notice without words, just experience" },
      { id: "describe", label: "Describe", description: "Put words on the experience" },
      { id: "participate", label: "Participate", description: "Enter fully into the experience" },
      { id: "nonjudgmental", label: "Nonjudgmental", description: "See without evaluating" },
      { id: "one_mindful", label: "One-Mindful", description: "Focus on one thing at a time" },
      { id: "effective", label: "Effective", description: "Do what works" },
    ],
  },
  interpersonal: {
    title: "Interpersonal Effectiveness",
    skills: [
      { id: "dear_man", label: "DEAR MAN", description: "Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate" },
      { id: "give", label: "GIVE", description: "Gentle, Interested, Validate, Easy manner" },
      { id: "fast", label: "FAST", description: "Fair, no Apologies, Stick to values, Truthful" },
      { id: "dialectics", label: "Dialectics", description: "Find the middle path" },
      { id: "validation", label: "Validation", description: "Communicate understanding" },
      { id: "behavior_change", label: "Behavior Change", description: "Strategies to change others' behavior" },
    ],
  },
  emotion_regulation: {
    title: "Emotion Regulation",
    skills: [
      { id: "check_facts", label: "Check the Facts", description: "Challenge assumptions and interpretations" },
      { id: "opposite_action", label: "Opposite Action", description: "Act opposite to emotional urges" },
      { id: "problem_solve", label: "Problem Solve", description: "Address the prompting event" },
      { id: "accumulate_positive", label: "Accumulate Positive", description: "Build positive experiences" },
      { id: "build_mastery", label: "Build Mastery", description: "Develop skills and competence" },
      { id: "cope_ahead", label: "Cope Ahead", description: "Plan for difficult situations" },
      { id: "please", label: "PLEASE", description: "Physical illness, Eating, Avoid drugs, Sleep, Exercise" },
      { id: "mindful_emotion", label: "Mindful of Emotion", description: "Observe and describe emotions" },
    ],
  },
  distress_tolerance: {
    title: "Distress Tolerance",
    skills: [
      { id: "stop", label: "STOP", description: "Stop, Take a step back, Observe, Proceed mindfully" },
      { id: "pros_cons", label: "Pros and Cons", description: "Weigh options for acting on urges" },
      { id: "tip", label: "TIP", description: "Temperature, Intense exercise, Paced breathing, Paired muscle relaxation" },
      { id: "distract", label: "Distract (ACCEPTS)", description: "Activities, Contributing, Comparisons, Emotions, Push away, Thoughts, Sensations" },
      { id: "self_soothe", label: "Self-Soothe", description: "Use the five senses to comfort" },
      { id: "improve", label: "IMPROVE", description: "Imagery, Meaning, Prayer, Relaxation, One thing, Vacation, Encouragement" },
      { id: "radical_acceptance", label: "Radical Acceptance", description: "Accept reality as it is" },
      { id: "turning_mind", label: "Turning the Mind", description: "Choose to accept reality over and over" },
      { id: "half_smile", label: "Half-Smile", description: "Relax face with slight smile" },
      { id: "willing_hands", label: "Willing Hands", description: "Open hands, palms up" },
      { id: "willingness", label: "Willingness", description: "Accept reality and respond skillfully" },
    ],
  },
};

export default function SkillsLibraryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const theme = Colors.dark;
  const [expandedModule, setExpandedModule] = useState<string | null>("mindfulness");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      {Object.entries(SKILLS_DATA).map(([moduleKey, module]) => (
        <View key={moduleKey} style={styles.moduleContainer}>
          <Pressable
            onPress={() => setExpandedModule(expandedModule === moduleKey ? null : moduleKey)}
            style={styles.moduleHeader}
          >
            <ThemedText style={styles.moduleTitle}>{module.title}</ThemedText>
            <View style={styles.moduleCount}>
              <ThemedText style={styles.moduleCountText}>{module.skills.length}</ThemedText>
            </View>
            <Feather
              name={expandedModule === moduleKey ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textTertiary}
            />
          </Pressable>

          {expandedModule === moduleKey && (
            <View style={styles.skillsList}>
              {module.skills.map((skill) => (
                <View key={skill.id} style={styles.skillItem}>
                  <View style={styles.skillDot} />
                  <View style={styles.skillContent}>
                    <ThemedText style={styles.skillLabel}>{skill.label}</ThemedText>
                    <ThemedText style={styles.skillDescription}>{skill.description}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  moduleContainer: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  moduleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
  },
  moduleCount: {
    backgroundColor: Colors.dark.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  moduleCountText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  skillsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  skillItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
    marginTop: 6,
  },
  skillContent: {
    flex: 1,
  },
  skillLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  skillDescription: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    lineHeight: 18,
  },
});
