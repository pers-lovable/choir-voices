import { useRef, useState, useCallback, useEffect } from "react";
import type { AppSettings } from "./useSettings";

export type VoiceName = "grön" | "röd" | "svart" | "instrument";

export interface VoiceState {
  name: VoiceName;
  volume: number;
  loading: boolean;
  error: string | null;
}

export interface WaveformData {
  data: Float32Array;
  decodedDuration: number;
}

export interface PlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  currentSong: string | null;
  voices: Record<VoiceName, VoiceState>;
  waveforms: Record<VoiceName, WaveformData | null>;
}

const VOICE_NAMES: VoiceName[] = ["grön", "röd", "svart", "instrument"];

const WAVEFORM_SAMPLES = 4000;

async function decodeWaveform(blob: Blob): Promise<WaveformData> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    // Use audioBuffer.duration (the raw decoded duration) as the denominator
    // for sample index mapping in WaveformDisplay. This duration may include
    // MP3 encoder delay/trailing padding that Firefox/Safari do not strip,
    // making it slightly longer than HTMLAudioElement.duration. By keeping
    // it here and threading it to the renderer, the waveform scrolls in
    // lockstep with what was actually decoded — no samples are discarded
    // and audio playback is completely unaffected.
    const blockSize = Math.floor(channelData.length / WAVEFORM_SAMPLES);
    const waveform = new Float32Array(WAVEFORM_SAMPLES);
    for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
      let max = 0;
      const start = i * blockSize;
      const end = start + blockSize;
      for (let j = start; j < end; j++) {
        const v = Math.abs(channelData[j]);
        if (v > max) max = v;
      }
      waveform[i] = max;
    }
    return { data: waveform, decodedDuration: audioBuffer.duration };
  } finally {
    audioContext.close();
  }
}

function makeUrl(baseUrl: string, songName: string, voice: string) {
  return new URL(`${baseUrl}/${songName}/${voice}.mp3`).toString();
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
    waveforms: { "grön": null, "röd": null, "svart": null, "instrument": null },
  });

  const animFrameRef = useRef<number>(0);
  const loadIdRef = useRef(0);
  const syncFrameRef = useRef(0);

  // Drift threshold: snap any track that deviates more than this from the
  // reference. 40ms is below the threshold for audible flanger/echo but large
  // enough not to trigger on normal scheduling jitter.
  const DRIFT_THRESHOLD = 0.04;
  // Check drift every N animation frames (~2 s at 60 fps).
  const SYNC_INTERVAL_FRAMES = 120;

  const updateTime = useCallback(() => {
    const first = audioRefs.current["grön"] || audioRefs.current["röd"] || audioRefs.current["svart"];
    if (first && !first.paused) {
      setState(s => ({
        ...s,
        currentTime: first.currentTime,
        duration: first.duration || 0,
      }));

      // Periodic drift correction: keep secondary tracks locked to grön.
      // On iOS, HTMLAudioElement instances can develop subtle rate differences
      // over time (different internal clocks/resamplers), causing convergence
      // and divergence that sounds like flanger/echo. Snapping drifted tracks
      // back to the reference every ~2 s keeps them aligned.
      syncFrameRef.current += 1;
      if (syncFrameRef.current >= SYNC_INTERVAL_FRAMES) {
        syncFrameRef.current = 0;
        const refTime = audioRefs.current["grön"]?.currentTime ?? first.currentTime;
        VOICE_NAMES.forEach(v => {
          if (v === "grön") return;
          const el = audioRefs.current[v];
          if (el && !el.paused && Math.abs(el.currentTime - refTime) > DRIFT_THRESHOLD) {
            el.currentTime = refTime;
          }
        });
      }

      animFrameRef.current = requestAnimationFrame(updateTime);
    } else if (first?.ended) {
      setState(s => ({ ...s, playing: false }));
    }
  }, []);

  const loadSong = useCallback(async (songName: string) => {
    const loadId = ++loadIdRef.current;

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
      waveforms: { "grön": null, "röd": null, "svart": null, "instrument": null },
      voices: Object.fromEntries(
        VOICE_NAMES.map(v => [v, { ...s.voices[v], loading: true, error: null }])
      ) as Record<VoiceName, VoiceState>,
    }));

    // Create audio elements with auth
    for (const voice of VOICE_NAMES) {
      try {
        const url = makeUrl(settings.serverUrl, songName, voice);

        // Fetch with basic auth
        const response = await fetch(url, {
          headers: {
            "Authorization": "Basic " + btoa(`choir:${settings.password}`),
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

        // Decode waveform in background — does not block audio playback
        decodeWaveform(blob).then(waveform => {
          if (loadIdRef.current !== loadId) return;
          setState(s => ({
            ...s,
            waveforms: { ...s.waveforms, [voice]: waveform },
          }));
        }).catch(() => {});
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
  }, [settings.serverUrl, settings.password]);

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

    syncFrameRef.current = 0;
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
