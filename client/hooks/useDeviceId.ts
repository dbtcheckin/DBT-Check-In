import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "@device_id";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }

    const newId = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    cachedDeviceId = newId;
    return newId;
  } catch {
    const fallbackId = generateUUID();
    cachedDeviceId = fallbackId;
    return fallbackId;
  }
}

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(cachedDeviceId);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  return deviceId;
}
