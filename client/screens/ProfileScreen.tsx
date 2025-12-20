import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const AVATAR_PRESETS = [
  { id: 0, color: "#c4a67c", icon: "circle" as const },
  { id: 1, color: "#6366f1", icon: "hexagon" as const },
  { id: 2, color: "#10b981", icon: "octagon" as const },
  { id: 3, color: "#f59e0b", icon: "square" as const },
  { id: 4, color: "#ec4899", icon: "triangle" as const },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = Colors.dark;

  const [displayName, setDisplayName] = useState("User");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState("20:00");

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(
        "userProfile",
        JSON.stringify({
          displayName,
          selectedAvatar,
          notificationsEnabled,
          notificationTime,
        })
      );
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await AsyncStorage.getItem("userProfile");
        if (profile) {
          const data = JSON.parse(profile);
          setDisplayName(data.displayName || "User");
          setSelectedAvatar(data.selectedAvatar || 0);
          setNotificationsEnabled(data.notificationsEnabled ?? true);
          setNotificationTime(data.notificationTime || "20:00");
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };
    loadProfile();
  }, []);

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card elevation={1} style={styles.section}>
        <ThemedText style={styles.sectionTitle} type="caption">
          AVATAR
        </ThemedText>
        <View style={styles.avatarGrid}>
          {AVATAR_PRESETS.map((avatar) => (
            <Pressable
              key={avatar.id}
              onPress={() => {
                setSelectedAvatar(avatar.id);
                handleSave();
              }}
              style={[
                styles.avatarOption,
                selectedAvatar === avatar.id && styles.avatarOptionSelected,
                { backgroundColor: avatar.color },
              ]}
            >
              <Feather name={avatar.icon} size={24} color="#ffffff" />
            </Pressable>
          ))}
        </View>
      </Card>

      <Card elevation={1} style={styles.section}>
        <ThemedText style={styles.sectionTitle} type="caption">
          DISPLAY NAME
        </ThemedText>
        <TextInput
          style={styles.textInput}
          value={displayName}
          onChangeText={setDisplayName}
          onBlur={handleSave}
          placeholder="Enter your name"
          placeholderTextColor={theme.textTertiary}
        />
      </Card>

      <Card elevation={1} style={styles.section}>
        <ThemedText style={styles.sectionTitle} type="caption">
          NOTIFICATIONS
        </ThemedText>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Feather name="bell" size={20} color={theme.text} />
            <ThemedText style={styles.settingLabel}>Daily Reminder</ThemedText>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => {
              setNotificationsEnabled(value);
              handleSave();
            }}
            trackColor={{ false: theme.backgroundSecondary, true: theme.accent }}
            thumbColor="#ffffff"
          />
        </View>

        {notificationsEnabled && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="clock" size={20} color={theme.text} />
              <ThemedText style={styles.settingLabel}>Reminder Time</ThemedText>
            </View>
            <ThemedText style={styles.settingValue} fontFamily="mono">
              {notificationTime}
            </ThemedText>
          </View>
        )}
      </Card>

      <Card elevation={1} style={styles.section}>
        <ThemedText style={styles.sectionTitle} type="caption">
          ABOUT
        </ThemedText>
        
        <View style={styles.aboutRow}>
          <ThemedText style={styles.aboutLabel}>Version</ThemedText>
          <ThemedText style={styles.aboutValue} fontFamily="mono">
            1.0.0
          </ThemedText>
        </View>
        
        <View style={styles.aboutRow}>
          <ThemedText style={styles.aboutLabel}>DBT Check-In</ThemedText>
        </View>
        
        <ThemedText style={styles.aboutDescription} type="small">
          A voice-first DBT diary card app. Speak naturally about your day, and let AI help complete your diary card.
        </ThemedText>
      </Card>

      <Pressable
        onPress={async () => {
          try {
            await AsyncStorage.clear();
            setDisplayName("User");
            setSelectedAvatar(0);
            setNotificationsEnabled(true);
            setNotificationTime("20:00");
          } catch (error) {
            console.error("Failed to reset:", error);
          }
        }}
        style={({ pressed }) => [
          styles.resetButton,
          pressed && styles.resetButtonPressed,
        ]}
      >
        <Feather name="refresh-cw" size={18} color={theme.textTertiary} />
        <ThemedText style={styles.resetText}>Reset All Data</ThemedText>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  avatarGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarOptionSelected: {
    borderColor: "#ffffff",
  },
  textInput: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    color: Colors.dark.textSecondary,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  aboutLabel: {
    color: Colors.dark.textSecondary,
  },
  aboutValue: {
    color: Colors.dark.textTertiary,
  },
  aboutDescription: {
    color: Colors.dark.textTertiary,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  resetButtonPressed: {
    opacity: 0.7,
  },
  resetText: {
    color: Colors.dark.textTertiary,
    fontSize: 15,
  },
});
