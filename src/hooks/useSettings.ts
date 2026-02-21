import { useState, useEffect } from "react";

export interface AppSettings {
  serverUrl: string;
  password: string;
  username: string;
}

const SETTINGS_KEY = "choir-voices-settings";

const defaultSettings: AppSettings = {
  serverUrl: "https://choir-worker.choir-voices.workers.dev/vt2026",
  password: "",
  username: "choir",
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {}
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}
