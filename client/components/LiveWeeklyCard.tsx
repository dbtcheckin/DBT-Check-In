import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export type WeeklyCardData = {
  sessionUrges: Record<string, { value: number | null; detected?: boolean }>;
  beliefToRegulate: Record<string, { value: number | null; detected?: boolean }>;
  medChanges?: string;
  homework?: string;
  skillsFocus?: string;
};

const SESSION_URGES = [
  { id: "quit_therapy", label: "Quit Therapy" },
  { id: "use_drugs", label: "Use Drugs" },
  { id: "suicide", label: "Suicide" },
];

const BELIEFS = [
  { id: "emotions", label: "Emotions" },
  { id: "actions", label: "Actions" },
  { id: "thoughts", label: "Thoughts" },
];

type FieldCellProps = {
  label: string;
  value: number | null | undefined;
  isGlowing?: boolean;
  isUncertain?: boolean;
};

function FieldCell({ label, value, isGlowing, isUncertain }: FieldCellProps) {
  const hasVal = value !== undefined && value !== null;
  const display = hasVal ? String(value) : "-";

  return (
    <View style={[styles.fieldCell, isGlowing && styles.fieldCellGlowing]}>
      <ThemedText
        style={[styles.fieldLabel, hasVal && styles.fieldLabelActive]}
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

type TextFieldProps = {
  label: string;
  value: string | undefined;
  isGlowing?: boolean;
};

function TextField({ label, value, isGlowing }: TextFieldProps) {
  const hasVal = !!value && value.trim().length > 0;

  return (
    <View style={[styles.textField, isGlowing && styles.textFieldGlowing]}>
      <ThemedText
        style={[styles.textFieldLabel, hasVal && styles.textFieldLabelActive]}
      >
        {label}
      </ThemedText>
      <ThemedText
        style={[styles.textFieldValue, hasVal && styles.textFieldValueActive]}
        numberOfLines={2}
      >
        {hasVal ? value : "..."}
      </ThemedText>
    </View>
  );
}

type LiveWeeklyCardProps = {
  data: WeeklyCardData;
  glowingFields?: Set<string>;
  uncertainFields?: Set<string>;
  weekRange: string;
};

export default function LiveWeeklyCard({
  data,
  glowingFields = new Set(),
  uncertainFields = new Set(),
  weekRange,
}: LiveWeeklyCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText style={styles.title} fontFamily="mono">
          WEEKLY DIARY CARD
        </ThemedText>
        <ThemedText style={styles.subtitle} fontFamily="mono">
          {weekRange}
        </ThemedText>
      </View>

      <View style={styles.twoColumnSection}>
        <View style={styles.column}>
          <ThemedText style={styles.sectionHeader}>SESSION URGES (0-5)</ThemedText>
          {SESSION_URGES.map((item) => (
            <FieldCell
              key={item.id}
              label={item.label}
              value={data.sessionUrges[item.id]?.value}
              isGlowing={glowingFields.has(`sessionUrges.${item.id}`)}
              isUncertain={uncertainFields.has(`sessionUrges.${item.id}`)}
            />
          ))}
        </View>
        <View style={styles.column}>
          <ThemedText style={styles.sectionHeader}>BELIEFS (0-5)</ThemedText>
          {BELIEFS.map((item) => (
            <FieldCell
              key={item.id}
              label={item.label}
              value={data.beliefToRegulate[item.id]?.value}
              isGlowing={glowingFields.has(`beliefs.${item.id}`)}
              isUncertain={uncertainFields.has(`beliefs.${item.id}`)}
            />
          ))}
        </View>
      </View>

      <View style={styles.weeklySections}>
        <ThemedText style={styles.sectionHeader}>WEEKLY SECTIONS</ThemedText>
        <TextField
          label="Medication Changes"
          value={data.medChanges}
          isGlowing={glowingFields.has("medChanges")}
        />
        <TextField
          label="Homework"
          value={data.homework}
          isGlowing={glowingFields.has("homework")}
        />
        <TextField
          label="Skills Focus"
          value={data.skillsFocus}
          isGlowing={glowingFields.has("skillsFocus")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.md,
  },
  titleRow: {
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },
  twoColumnSection: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  column: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 9,
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  fieldCell: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  fieldCellGlowing: {
    backgroundColor: Colors.dark.accentMuted,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  fieldLabelActive: {
    color: Colors.dark.text,
  },
  fieldValue: {
    fontSize: 14,
    color: Colors.dark.textTertiary,
    minWidth: 20,
    textAlign: "right",
  },
  fieldValueActive: {
    color: Colors.dark.accent,
  },
  fieldValueUncertain: {
    color: Colors.dark.warning,
  },
  weeklySections: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  textField: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  textFieldGlowing: {
    backgroundColor: Colors.dark.accentMuted,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  textFieldLabel: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    marginBottom: 2,
  },
  textFieldLabelActive: {
    color: Colors.dark.textSecondary,
  },
  textFieldValue: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    fontStyle: "italic",
  },
  textFieldValueActive: {
    color: Colors.dark.text,
    fontStyle: "normal",
  },
});
