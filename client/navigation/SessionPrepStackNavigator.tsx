import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SessionPrepScreen from "@/screens/SessionPrepScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type SessionPrepStackParamList = {
  SessionPrep: undefined;
};

const Stack = createNativeStackNavigator<SessionPrepStackParamList>();

export default function SessionPrepStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="SessionPrep"
        component={SessionPrepScreen}
        options={{ headerTitle: "Session Prep" }}
      />
    </Stack.Navigator>
  );
}
