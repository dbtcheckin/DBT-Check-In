import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import RecordingScreen from "@/screens/RecordingScreen";
import AICompletionScreen from "@/screens/AICompletionScreen";
import FinalReviewScreen from "@/screens/FinalReviewScreen";
import SkillsLibraryScreen from "@/screens/SkillsLibraryScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  Recording: undefined;
  AICompletion: {
    transcript: string;
    extractedData: ExtractedData;
    entryId?: string;
  };
  FinalReview: {
    entryId: string;
    diaryData: DiaryData;
  };
  SkillsLibrary: undefined;
};

export type ExtractedData = {
  emotions?: Record<string, number>;
  urges?: Record<string, number>;
  skills_used?: string[];
  behaviors?: Record<string, boolean>;
  context?: { prompting_events?: string[]; vulnerabilities?: string[] };
  missing?: string[];
};

export type DiaryData = {
  emotions: Record<string, number>;
  urges: Record<string, number>;
  skills: string[];
  behaviors: Record<string, boolean>;
  context: { promptingEvents: string[]; vulnerabilities: string[] };
  actedOnUrges: boolean;
  transcript: string;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Recording"
        component={RecordingScreen}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AICompletion"
        component={AICompletionScreen}
        options={{
          presentation: "modal",
          headerTitle: "Complete Your Card",
        }}
      />
      <Stack.Screen
        name="FinalReview"
        component={FinalReviewScreen}
        options={{
          presentation: "modal",
          headerTitle: "Entry Complete",
        }}
      />
      <Stack.Screen
        name="SkillsLibrary"
        component={SkillsLibraryScreen}
        options={{
          headerTitle: "Skills Library",
        }}
      />
    </Stack.Navigator>
  );
}
