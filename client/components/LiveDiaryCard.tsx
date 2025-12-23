import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Accordion } from "@/components/Accordion";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { CustomFieldConfig } from "@shared/schema";

export type DiaryCardData = {
  urges: Record<string, { value: number | null; detected?: boolean }>;
  emotions: Record<string, { value: number | null; detected?: boolean }>;
  actions: Record<string, { value: number | boolean | null; detected?: boolean }>;
  substances: Record<string, { value: string | null; detected?: boolean }>;
  skills: Record<string, { used: boolean; detected?: boolean }>;
  behaviors: Record<string, boolean>;
  weeklySession?: {
    sessionUrges: Record<string, { value: number | null; detected?: boolean }>;
    beliefToRegulate: Record<string, { value: number | null; detected?: boolean }>;
    medChanges?: string;
    homework?: string;
    skillsFocus?: string;
  };
  metadata?: {
    filledOutInSession?: boolean;
    howOftenFilledOut?: string;
    lastDayFilledOut?: string;
  };
};

const URGES = [
  { id: "suicide", label: "Suicide" },
  { id: "self_harm", label: "Self-Harm" },
  { id: "drugs", label: "Drugs" },
];

const CORE_EMOTIONS = [
  { id: "emotion_misery", label: "Emotion Misery", color: Colors.dark.emotions.emotion_misery },
  { id: "physical_misery", label: "Physical Misery", color: Colors.dark.emotions.physical_misery },
  { id: "joy", label: "Joy", color: Colors.dark.emotions.joy },
];

const OPTIONAL_EMOTIONS = [
  { id: "anxiety", label: "Anxiety", color: Colors.dark.emotions.anxiety },
  { id: "sadness", label: "Sadness", color: Colors.dark.emotions.sadness },
  { id: "anger", label: "Anger", color: Colors.dark.emotions.anger },
  { id: "shame", label: "Shame", color: Colors.dark.emotions.shame },
  { id: "fear", label: "Fear", color: Colors.dark.emotions.fear },
];

const ACTIONS = [
  { id: "self_harm_action", label: "Self-Harm", type: "boolean" as const },
  { id: "lied", label: "Lied", type: "count" as const },
  { id: "used_skills", label: "Skills Used", type: "scale7" as const },
];

const SUBSTANCES = [
  { id: "alcohol", label: "Alcohol", description: "# + type" },
  { id: "illegal_drugs", label: "Drugs", description: "# + type" },
  { id: "meds_prescribed", label: "Meds Rx'd", description: "Y/N" },
  { id: "prn_otc_meds", label: "PRN/OTC", description: "# + type" },
];

const SESSION_URGES = [
  { id: "quit_therapy", label: "Quit Therapy" },
  { id: "use_drugs", label: "Use Drugs" },
  { id: "commit_suicide", label: "Commit Suicide" },
];

const BELIEF_TO_REGULATE = [
  { id: "emotions", label: "Emotions" },
  { id: "actions", label: "Actions" },
  { id: "thoughts", label: "Thoughts" },
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
  type?: "scale" | "scale7" | "boolean" | "count" | "text" | "quantity";
  color?: string;
  scaleLabel?: string;
};

function FieldCell({ label, value, isGlowing, isUncertain, type = "scale", color, scaleLabel }: FieldCellProps) {
  const hasVal = value !== undefined && value !== null;
  let display: string;
  
  if (type === "boolean") {
    display = value === true ? "Y" : value === false ? "N" : "-";
  } else if (type === "count") {
    display = hasVal ? `#${value}` : "-";
  } else if (type === "scale7") {
    display = hasVal ? String(value) : "-";
  } else if (type === "quantity") {
    display = hasVal ? String(value) : "-";
  } else {
    display = hasVal ? String(value) : "-";
  }

  return (
    <View style={[styles.fieldCell, isGlowing && styles.fieldCellGlowing]}>
      <View style={styles.fieldLabelContainer}>
        <ThemedText
          style={[
            styles.fieldLabel,
            hasVal && styles.fieldLabelActive,
            color ? { color } : null,
          ]}
        >
          {label}
        </ThemedText>
        {scaleLabel ? <ThemedText style={styles.scaleLabel}>{scaleLabel}</ThemedText> : null}
      </View>
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
  customEmotions?: CustomFieldConfig[];
  customBehaviors?: CustomFieldConfig[];
  onAddCustomEmotion?: (label: string) => void;
  onAddCustomBehavior?: (label: string) => void;
};

export default function LiveDiaryCard({ 
  data, 
  glowingFields = new Set(), 
  uncertainFields = new Set(),
  customEmotions = [],
  customBehaviors = [],
  onAddCustomEmotion,
  onAddCustomBehavior,
}: LiveDiaryCardProps) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const [newEmotionLabel, setNewEmotionLabel] = useState("");
  const [newBehaviorLabel, setNewBehaviorLabel] = useState("");

  const hasOptionalEmotions = OPTIONAL_EMOTIONS.some(
    (field) => data.emotions[field.id]?.value != null
  );

  const handleAddEmotion = () => {
    if (newEmotionLabel.trim() && onAddCustomEmotion) {
      onAddCustomEmotion(newEmotionLabel.trim());
      setNewEmotionLabel("");
    }
  };

  const handleAddBehavior = () => {
    if (newBehaviorLabel.trim() && onAddCustomBehavior) {
      onAddCustomBehavior(newBehaviorLabel.trim());
      setNewBehaviorLabel("");
    }
  };

  const hasWeeklyData = data.weeklySession && (
    Object.values(data.weeklySession.sessionUrges || {}).some(v => v?.value != null) ||
    Object.values(data.weeklySession.beliefToRegulate || {}).some(v => v?.value != null) ||
    data.weeklySession.medChanges ||
    data.weeklySession.homework ||
    data.weeklySession.skillsFocus
  );

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
          <ThemedText style={styles.sectionTitle}>Highest Ratings (0-5)</ThemedText>
          {CORE_EMOTIONS.map((field) => (
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

      {hasOptionalEmotions ? (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.column}>
              <ThemedText style={styles.sectionTitle}>Additional Emotions (0-5)</ThemedText>
              {OPTIONAL_EMOTIONS.map((field) => (
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
        </>
      ) : null}

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
              type={field.type}
              scaleLabel={field.type === "scale7" ? "(0-7)" : field.type === "count" ? "(#)" : undefined}
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
                field.id === "meds_prescribed"
                  ? (data.substances[field.id]?.value === "yes" ? true : 
                     data.substances[field.id]?.value === "no" ? false :
                     data.substances[field.id]?.value === "none" ? false : null)
                  : data.substances[field.id]?.value
              }
              isGlowing={glowingFields.has(`substances.${field.id}`)}
              type={field.id === "meds_prescribed" ? "boolean" : "quantity"}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.skillsSection}>
        <ThemedText style={styles.sectionTitle}>Skills Checklist</ThemedText>
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

      <View style={styles.divider} />

      <Accordion 
        title="Custom Emotions & Behaviors (OPTIONAL)" 
        defaultExpanded={false}
        titleStyle={styles.headerText}
      >
        <View style={styles.row}>
          <View style={styles.column}>
            <ThemedText style={styles.subsectionTitle}>Core Emotions (0-5)</ThemedText>
            {OPTIONAL_EMOTIONS.map((field) => (
              <FieldCell
                key={field.id}
                label={field.label}
                value={data.emotions[field.id]?.value}
                isGlowing={glowingFields.has(`emotions.${field.id}`)}
                isUncertain={uncertainFields.has(`emotions.${field.id}`)}
                color={data.emotions[field.id]?.value != null ? field.color : undefined}
              />
            ))}
            {customEmotions.map((field) => (
              <FieldCell
                key={field.id}
                label={field.label}
                value={data.emotions[field.id]?.value}
                isGlowing={glowingFields.has(`emotions.${field.id}`)}
              />
            ))}
            {onAddCustomEmotion ? (
              <View style={styles.addFieldRow}>
                <TextInput
                  style={styles.addFieldInput}
                  value={newEmotionLabel}
                  onChangeText={setNewEmotionLabel}
                  placeholder="Add custom emotion..."
                  placeholderTextColor={Colors.dark.textSecondary}
                  onSubmitEditing={handleAddEmotion}
                />
                <Pressable onPress={handleAddEmotion} style={styles.addFieldButton}>
                  <Feather name="plus" size={16} color={Colors.dark.text} />
                </Pressable>
              </View>
            ) : null}
          </View>
          <View style={styles.column}>
            <ThemedText style={styles.subsectionTitle}>Behaviors</ThemedText>
            {customBehaviors.map((field) => (
              <FieldCell
                key={field.id}
                label={field.label}
                value={data.behaviors?.[field.id] ? true : false}
                type="boolean"
                isGlowing={glowingFields.has(`behaviors.${field.id}`)}
              />
            ))}
            {customBehaviors.length === 0 ? (
              <ThemedText style={styles.emptyText}>No behaviors tracked yet</ThemedText>
            ) : null}
            {onAddCustomBehavior ? (
              <View style={styles.addFieldRow}>
                <TextInput
                  style={styles.addFieldInput}
                  value={newBehaviorLabel}
                  onChangeText={setNewBehaviorLabel}
                  placeholder="Add custom behavior..."
                  placeholderTextColor={Colors.dark.textSecondary}
                  onSubmitEditing={handleAddBehavior}
                />
                <Pressable onPress={handleAddBehavior} style={styles.addFieldButton}>
                  <Feather name="plus" size={16} color={Colors.dark.text} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Accordion>

      {hasWeeklyData ? (
        <>
          <View style={styles.divider} />
          <View style={styles.weeklySection}>
            <ThemedText style={styles.sectionTitle}>Weekly / Pre-Session</ThemedText>
            <View style={styles.row}>
              <View style={styles.column}>
                <ThemedText style={styles.subsectionTitle}>Session Urges (0-5)</ThemedText>
                {SESSION_URGES.map((field) => (
                  <FieldCell
                    key={field.id}
                    label={field.label}
                    value={data.weeklySession?.sessionUrges?.[field.id]?.value}
                    isGlowing={glowingFields.has(`session.${field.id}`)}
                  />
                ))}
              </View>
              <View style={styles.column}>
                <ThemedText style={styles.subsectionTitle}>Belief I Can Change (0-5)</ThemedText>
                {BELIEF_TO_REGULATE.map((field) => (
                  <FieldCell
                    key={field.id}
                    label={field.label}
                    value={data.weeklySession?.beliefToRegulate?.[field.id]?.value}
                    isGlowing={glowingFields.has(`belief.${field.id}`)}
                  />
                ))}
              </View>
            </View>
            {data.weeklySession?.medChanges ? (
              <View style={styles.textFieldRow}>
                <ThemedText style={styles.textFieldLabel}>Med Changes:</ThemedText>
                <ThemedText style={styles.textFieldValue}>{data.weeklySession.medChanges}</ThemedText>
              </View>
            ) : null}
            {data.weeklySession?.homework ? (
              <View style={styles.textFieldRow}>
                <ThemedText style={styles.textFieldLabel}>Homework:</ThemedText>
                <ThemedText style={styles.textFieldValue}>{data.weeklySession.homework}</ThemedText>
              </View>
            ) : null}
            {data.weeklySession?.skillsFocus ? (
              <View style={styles.textFieldRow}>
                <ThemedText style={styles.textFieldLabel}>Skills Focus:</ThemedText>
                <ThemedText style={styles.textFieldValue}>{data.weeklySession.skillsFocus}</ThemedText>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
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
  fieldLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
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
  scaleLabel: {
    fontSize: 9,
    color: Colors.dark.textTertiary,
  },
  weeklySection: {
    marginTop: 4,
  },
  subsectionTitle: {
    fontSize: 8,
    color: Colors.dark.textGhost,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 8,
  },
  textFieldRow: {
    flexDirection: "row",
    paddingVertical: 6,
    gap: 8,
  },
  textFieldLabel: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
  },
  textFieldValue: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  addFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  addFieldInput: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: Colors.dark.text,
  },
  addFieldButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.sm,
    padding: 6,
  },
  emptyText: {
    fontSize: 10,
    color: Colors.dark.textGhost,
    fontStyle: "italic",
    paddingVertical: 8,
  },
});
