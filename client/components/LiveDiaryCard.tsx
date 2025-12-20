import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export type DiaryCardData = {
  urges: Record<string, { value: number | null; detected?: boolean }>;
  emotions: Record<string, { value: number | null; detected?: boolean }>;
  actions: Record<string, { value: boolean | null; detected?: boolean }>;
  substances: Record<string, { value: string | null; detected?: boolean }>;
  skills: Record<string, { used: boolean; detected?: boolean }>;
};

const URGES = [
  { id: "suicide", label: "Suicide" },
  { id: "self_harm", label: "Self-Harm" },
  { id: "drugs", label: "Drugs" },
];

const EMOTIONS = [
  { id: "anxiety", label: "Anxiety", color: Colors.dark.emotions.anxiety },
  { id: "sadness", label: "Sadness", color: Colors.dark.emotions.sadness },
  { id: "anger", label: "Anger", color: Colors.dark.emotions.anger },
  { id: "shame", label: "Shame", color: Colors.dark.emotions.shame },
  { id: "joy", label: "Joy", color: Colors.dark.emotions.joy },
  { id: "misery", label: "Misery", color: Colors.dark.emotions.misery },
];

const ACTIONS = [
  { id: "self_harm_action", label: "Self-Harm" },
  { id: "lied", label: "Lied" },
  { id: "used_skills", label: "Skills Used" },
];

const SUBSTANCES = [
  { id: "alcohol", label: "Alcohol" },
  { id: "illegal_drugs", label: "Drugs" },
  { id: "meds_prescribed", label: "Meds Rx'd" },
];

const SKILLS = {
  mindfulness: ["wise_mind", "observe", "describe", "participate", "nonjudgmental", "one_mindful", "effective"],
  interpersonal: ["dear_man", "give", "fast", "dialectics", "validation", "behavior_change"],
  emotion_regulation: ["check_facts", "opposite_action", "problem_solve", "accumulate_positive", "build_mastery", "cope_ahead", "please", "mindful_emotion"],
  distress_tolerance: ["stop", "pros_cons", "tip", "distract", "self_soothe", "improve", "radical_acceptance", "turning_mind", "half_smile", "willing_hands", "willingness"],
};

type FieldCellProps = {
  label: string;
  value: number | string | boolean | null | undefined;
  isGlowing?: boolean;
  isUncertain?: boolean;
  type?: "scale" | "boolean" | "text";
  color?: string;
};

function FieldCell({ label, value, isGlowing, isUncertain, type = "scale", color }: FieldCellProps) {
  const hasVal = value !== undefined && value !== null;
  let display: string;
  
  if (type === "boolean") {
    display = value === true ? "Y" : value === false ? "N" : "-";
  } else {
    display = hasVal ? String(value) : "-";
  }

  return (
    <View style={[styles.fieldCell, isGlowing && styles.fieldCellGlowing]}>
      <ThemedText
        style={[
          styles.fieldLabel,
          hasVal && styles.fieldLabelActive,
          color ? { color } : null,
        ]}
      >
        {label}
      </ThemedText>
      <ThemedText
        style={[
          styles.fieldValue,
          hasVal && styles.fieldValueActive,
          isUncertain && styles.fieldValueUncertain,
        ]}
        fontFamily="mono"
      >
        {isUncertain ? "?" : display}
      </ThemedText>
    </View>
  );
}

type SkillDotProps = {
  used: boolean;
  isGlowing?: boolean;
};

function SkillDot({ used, isGlowing }: SkillDotProps) {
  return (
    <View
      style={[
        styles.skillDot,
        used && styles.skillDotActive,
        isGlowing && styles.skillDotGlowing,
      ]}
    />
  );
}

type LiveDiaryCardProps = {
  data: DiaryCardData;
  glowingFields?: Set<string>;
  uncertainFields?: Set<string>;
};

export default function LiveDiaryCard({ data, glowingFields = new Set(), uncertainFields = new Set() }: LiveDiaryCardProps) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerText} fontFamily="mono">
          DBT Diary Card - {today}
        </ThemedText>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText style={styles.sectionTitle}>Urges (0-5)</ThemedText>
          {URGES.map((field) => (
            <FieldCell
              key={field.id}
              label={field.label}
              value={data.urges[field.id]?.value}
              isGlowing={glowingFields.has(`urges.${field.id}`)}
              isUncertain={uncertainFields.has(`urges.${field.id}`)}
            />
          ))}
        </View>
        <View style={styles.column}>
          <ThemedText style={styles.sectionTitle}>Emotions (0-5)</ThemedText>
          {EMOTIONS.map((field) => (
            <FieldCell
              key={field.id}
              label={field.label}
              value={data.emotions[field.id]?.value}
              isGlowing={glowingFields.has(`emotions.${field.id}`)}
              isUncertain={uncertainFields.has(`emotions.${field.id}`)}
              color={data.emotions[field.id]?.value != null ? field.color : undefined}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText style={styles.sectionTitle}>Actions</ThemedText>
          {ACTIONS.map((field) => (
            <FieldCell
              key={field.id}
              label={field.label}
              value={data.actions[field.id]?.value}
              isGlowing={glowingFields.has(`actions.${field.id}`)}
              type="boolean"
            />
          ))}
        </View>
        <View style={styles.column}>
          <ThemedText style={styles.sectionTitle}>Substances</ThemedText>
          {SUBSTANCES.map((field) => (
            <FieldCell
              key={field.id}
              label={field.label}
              value={
                data.substances[field.id]?.value === "none"
                  ? false
                  : data.substances[field.id]?.value
                    ? true
                    : null
              }
              isGlowing={glowingFields.has(`substances.${field.id}`)}
              type="boolean"
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.skillsSection}>
        <ThemedText style={styles.sectionTitle}>Skills Used</ThemedText>
        {Object.entries(SKILLS).map(([module, skillIds]) => (
          <View key={module} style={styles.skillModule}>
            <ThemedText style={styles.skillModuleLabel}>
              {module.replace(/_/g, " ")}
            </ThemedText>
            <View style={styles.skillDots}>
              {skillIds.map((skillId) => (
                <SkillDot
                  key={skillId}
                  used={data.skills[skillId]?.used || false}
                  isGlowing={glowingFields.has(`skills.${skillId}`)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: 14,
  },
  header: {
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundTertiary,
  },
  headerText: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 9,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldCell: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 4,
  },
  fieldCellGlowing: {
    backgroundColor: Colors.dark.accentGlow,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.dark.textGhost,
  },
  fieldLabelActive: {
    color: Colors.dark.textSecondary,
  },
  fieldValue: {
    fontSize: 13,
    color: Colors.dark.textGhost,
    minWidth: 20,
    textAlign: "right",
  },
  fieldValueActive: {
    color: Colors.dark.text,
    fontWeight: "500",
  },
  fieldValueUncertain: {
    color: Colors.dark.accent,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.backgroundTertiary,
    marginVertical: 12,
  },
  skillsSection: {
    marginTop: 0,
  },
  skillModule: {
    marginBottom: 8,
  },
  skillModuleLabel: {
    fontSize: 8,
    color: Colors.dark.textGhost,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  skillDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  skillDot: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: Colors.dark.backgroundTertiary,
  },
  skillDotActive: {
    backgroundColor: Colors.dark.accent,
  },
  skillDotGlowing: {
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
});
