import { useRef, useState, useCallback, useEffect } from "react";
import type { AppSettings } from "./useSettings";

export type VoiceName = "grön" | "röd" | "svart" | "instrument";

export interface VoiceState {
  name: VoiceName;
  volume: number;
  loading: boolean;
  error: string | null;
}

export interface PlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  currentSong: string | null;
  voices: Record<VoiceName, VoiceState>;
}

const VOICE_NAMES: VoiceName[] = ["grön", "röd", "svart", "instrument"];

function makeAuthUrl(baseUrl: string, songName: string, voice: string, username: string, password: string) {
  // Build URL with basic auth embedded for fetching
  const url = new URL(`${baseUrl}/${songName}/${voice}.mp3`);
  return { url: url.toString(), username, password };
}

export function useAudioPlayer(settings: AppSettings) {
  const audioRefs = useRef<Record<VoiceName, HTMLAudioElement | null>>({
    "grön": null,
    "röd": null,
    "svart": null,
    "instrument": null,
  });

  const [state, setState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    currentSong: null,
    voices: {
      "grön": { name: "grön", volume: 0.8, loading: false, error: null },
      "röd": { name: "röd", volume: 0.8, loading: false, error: null },
      "svart": { name: "svart", volume: 0.8, loading: false, error: null },
      "instrument": { name: "instrument", volume: 0.8, loading: false, error: null },
    },
  });

  const animFrameRef = useRef<number>(0);

  const updateTime = useCallback(() => {
    const first = audioRefs.current["grön"] || audioRefs.current["röd"] || audioRefs.current["svart"];
    if (first && !first.paused) {
      setState(s => ({
        ...s,
        currentTime: first.currentTime,
        duration: first.duration || 0,
      }));
      animFrameRef.current = requestAnimationFrame(updateTime);
    }
  }, []);

  const loadSong = useCallback(async (songName: string) => {
    // Stop current playback
    VOICE_NAMES.forEach(v => {
      const el = audioRefs.current[v];
      if (el) {
        el.pause();
        el.src = "";
      }
    });
    cancelAnimationFrame(animFrameRef.current);

    setState(s => ({
      ...s,
      playing: false,
      currentTime: 0,
      duration: 0,
      currentSong: songName,
      voices: Object.fromEntries(
        VOICE_NAMES.map(v => [v, { ...s.voices[v], loading: true, error: null }])
      ) as Record<VoiceName, VoiceState>,
    }));

    // Create audio elements with auth
    for (const voice of VOICE_NAMES) {
      try {
        const { url, username, password } = makeAuthUrl(settings.serverUrl, songName, voice, settings.username, settings.password);
        
        // Fetch with basic auth
        const response = await fetch(url, {
          headers: {
            "Authorization": "Basic " + btoa(`${username}:${password}`),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const audio = new Audio();
        audio.preload = "auto";
        audio.src = objectUrl;

        // Wait for metadata
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = () => reject(new Error("Failed to load audio"));
          // Timeout after 30s
          setTimeout(() => reject(new Error("Timeout loading audio")), 30000);
        });

        audioRefs.current[voice] = audio;
        audio.volume = state.voices[voice].volume;

        setState(s => ({
          ...s,
          duration: Math.max(s.duration, audio.duration || 0),
          voices: {
            ...s.voices,
            [voice]: { ...s.voices[voice], loading: false, error: null },
          },
        }));
      } catch (err: any) {
        setState(s => ({
          ...s,
          voices: {
            ...s.voices,
            [voice]: { ...s.voices[voice], loading: false, error: err.message || "Error" },
          },
        }));
      }
    }
  }, [settings.serverUrl, settings.password, settings.username]);

  const play = useCallback(() => {
    // Sync all to the same time first
    const first = audioRefs.current["grön"] || audioRefs.current["röd"] || audioRefs.current["svart"];
    if (!first) return;
    const time = first.currentTime;

    VOICE_NAMES.forEach(v => {
      const el = audioRefs.current[v];
      if (el) {
        el.currentTime = time;
        el.play().catch(() => {});
      }
    });

    setState(s => ({ ...s, playing: true }));
    animFrameRef.current = requestAnimationFrame(updateTime);
  }, [updateTime]);

  const pause = useCallback(() => {
    VOICE_NAMES.forEach(v => {
      audioRefs.current[v]?.pause();
    });
    cancelAnimationFrame(animFrameRef.current);
    setState(s => ({ ...s, playing: false }));
  }, []);

  const stop = useCallback(() => {
    VOICE_NAMES.forEach(v => {
      const el = audioRefs.current[v];
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
    });
    cancelAnimationFrame(animFrameRef.current);
    setState(s => ({ ...s, playing: false, currentTime: 0 }));
  }, []);

  const seek = useCallback((time: number) => {
    VOICE_NAMES.forEach(v => {
      const el = audioRefs.current[v];
      if (el) el.currentTime = Math.max(0, Math.min(time, el.duration || 0));
    });
    setState(s => ({ ...s, currentTime: time }));
  }, []);

  const skip = useCallback((seconds: number) => {
    const first = audioRefs.current["grön"] || audioRefs.current["röd"] || audioRefs.current["svart"];
    if (first) {
      seek(first.currentTime + seconds);
    }
  }, [seek]);

  const setVolume = useCallback((voice: VoiceName, volume: number) => {
    const el = audioRefs.current[voice];
    if (el) el.volume = volume;
    setState(s => ({
      ...s,
      voices: {
        ...s.voices,
        [voice]: { ...s.voices[voice], volume },
      },
    }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      VOICE_NAMES.forEach(v => {
        const el = audioRefs.current[v];
        if (el) {
          el.pause();
          el.src = "";
        }
      });
    };
  }, []);

  return { state, loadSong, play, pause, stop, seek, skip, setVolume, voiceNames: VOICE_NAMES };
}
