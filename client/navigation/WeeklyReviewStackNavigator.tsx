import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WeeklyReviewScreen from "@/screens/WeeklyReviewScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type WeeklyReviewStackParamList = {
  WeeklyReview: undefined;
};

const Stack = createNativeStackNavigator<WeeklyReviewStackParamList>();

export default function WeeklyReviewStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="WeeklyReview"
        component={WeeklyReviewScreen}
        options={{ headerTitle: "This Week" }}
      />
    </Stack.Navigator>
  );
}
