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
  waveform: Float32Array;
  /** Duration of the decoded AudioBuffer for this voice (seconds).
   *  Used as the denominator for waveform sample-index mapping so the
   *  waveform scrolls in lockstep with the actual audio regardless of
   *  per-voice encoding differences. */
  duration: number;
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

function extractWaveform(buffer: AudioBuffer): Float32Array {
  const channelData = buffer.getChannelData(0);
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
  return waveform;
}

function makeUrl(baseUrl: string, songName: string, voice: string) {
  return new URL(`${baseUrl}/${songName}/${voice}.mp3`).toString();
}

export function useAudioPlayer(settings: AppSettings) {
  // Web Audio API nodes — created lazily in play() inside a user gesture (iOS requirement)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<VoiceName, AudioBuffer | null>>({
    "grön": null, "röd": null, "svart": null, "instrument": null,
  });
  const gainNodesRef = useRef<Record<VoiceName, GainNode | null>>({
    "grön": null, "röd": null, "svart": null, "instrument": null,
  });
  const sourceNodesRef = useRef<Record<VoiceName, AudioBufferSourceNode | null>>({
    "grön": null, "röd": null, "svart": null, "instrument": null,
  });

  // Playback position tracking:
  //   currentTime = ctx.currentTime - startedAtRef   (while playing)
  //   pausedAtRef = position saved at pause/stop     (while paused)
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const durationRef = useRef(0);

  // Mirror of voice volumes so callbacks can read them without being in deps
  const volumesRef = useRef<Record<VoiceName, number>>({
    "grön": 0.8, "röd": 0.8, "svart": 0.8, "instrument": 0.8,
  });

  const animFrameRef = useRef(0);
  const loadIdRef = useRef(0);
  // Tracks whether playback is intentionally active. Lets the rAF loop stop
  // itself cleanly and allows it to wait for the context to finish resuming
  // after a synchronous (non-awaited) ctx.resume() call on iOS.
  const isPlayingRef = useRef(false);
  // Screen Wake Lock — keeps the display on while audio is playing.
  // Supported in Safari 16.4+. Gracefully no-ops on older browsers.
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [state, setState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    currentSong: null,
    voices: {
      "grön":      { name: "grön",       volume: 0.8, loading: false, error: null },
      "röd":       { name: "röd",        volume: 0.8, loading: false, error: null },
      "svart":     { name: "svart",      volume: 0.8, loading: false, error: null },
      "instrument":{ name: "instrument", volume: 0.8, loading: false, error: null },
    },
    waveforms: { "grön": null, "röd": null, "svart": null, "instrument": null },
  });

  const acquireWakeLock = useCallback(() => {
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then(sentinel => {
      wakeLockRef.current = sentinel;
      sentinel.addEventListener("release", () => { wakeLockRef.current = null; });
    }).catch(() => {});
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  // Stops all AudioBufferSourceNodes cleanly.
  // Sets onended=null first so natural-end detection is not accidentally triggered.
  const stopSourceNodes = useCallback(() => {
    VOICE_NAMES.forEach(v => {
      const src = sourceNodesRef.current[v];
      if (src) {
        src.onended = null;
        try { src.stop(); } catch { /* already ended */ }
        sourceNodesRef.current[v] = null;
      }
    });
  }, []);

  // rAF loop: reads position from AudioContext clock while playing.
  // When play() calls ctx.resume() synchronously (without awaiting), the context
  // may still be "suspended" for the first few frames while resume completes.
  // We re-queue the loop and wait — once "running", normal tracking resumes.
  const updateTime = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;
    if (ctx.state !== "running") {
      animFrameRef.current = requestAnimationFrame(updateTime);
      return;
    }
    const raw = ctx.currentTime - startedAtRef.current;
    setState(s => ({ ...s, currentTime: Math.max(0, Math.min(raw, durationRef.current)) }));
    animFrameRef.current = requestAnimationFrame(updateTime);
  }, []);

  // Creates new AudioBufferSourceNodes for all loaded voices and starts them all
  // at exactly ctx.currentTime + 0.01s with the given offset into the buffer.
  // All four voices share the same scheduled start time → perfect sync.
  const startNodesAt = useCallback((ctx: AudioContext, offset: number) => {
    const startTime = ctx.currentTime + 0.1;
    startedAtRef.current = startTime - offset;

    VOICE_NAMES.forEach(v => {
      const buffer = audioBuffersRef.current[v];
      const gain = gainNodesRef.current[v];
      if (!buffer || !gain) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gain);
      sourceNodesRef.current[v] = src;
    });

    // Detect natural song end via the first loaded voice.
    // onended is nullified by stopSourceNodes() on manual stop/seek, so this
    // only fires when the buffer actually runs out.
    const firstVoice = VOICE_NAMES.find(v => sourceNodesRef.current[v] !== null);
    if (firstVoice) {
      const src = sourceNodesRef.current[firstVoice]!;
      src.onended = () => {
        // Guard against stale closure from a previous play session
        if (sourceNodesRef.current[firstVoice] === src) {
          isPlayingRef.current = false;
          pausedAtRef.current = 0;
          cancelAnimationFrame(animFrameRef.current);
          releaseWakeLock();
          setState(s => ({ ...s, playing: false, currentTime: 0 }));
        }
      };
    }

    VOICE_NAMES.forEach(v => {
      sourceNodesRef.current[v]?.start(startTime, offset);
    });
  }, []);

  const play = useCallback(() => {
    stopSourceNodes();

    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;

    // iOS Safari requires both resume() AND source.start() to be called
    // synchronously within the same user-gesture handler. Using async/await
    // moves source.start() into a microtask continuation which iOS may not
    // consider "user-activated", resulting in silent (but otherwise running)
    // audio nodes. Calling resume() fire-and-forget and starting sources
    // immediately satisfies iOS's requirement: sources scheduled at
    // ctx.currentTime + 0.01 will start as soon as the context resumes
    // (typically within one audio-processing quantum, ~3 ms).
    ctx.resume();
    startNodesAt(ctx, pausedAtRef.current);

    isPlayingRef.current = true;
    acquireWakeLock();
    setState(s => ({ ...s, playing: true }));
    animFrameRef.current = requestAnimationFrame(updateTime);
  }, [stopSourceNodes, startNodesAt, updateTime, acquireWakeLock]);

  const pause = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    pausedAtRef.current = Math.max(0, ctx.currentTime - startedAtRef.current);
    isPlayingRef.current = false;
    stopSourceNodes();
    ctx.suspend();
    cancelAnimationFrame(animFrameRef.current);
    releaseWakeLock();
    setState(s => ({ ...s, playing: false }));
  }, [stopSourceNodes, releaseWakeLock]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    stopSourceNodes();
    pausedAtRef.current = 0;
    audioCtxRef.current?.suspend();
    cancelAnimationFrame(animFrameRef.current);
    releaseWakeLock();
    setState(s => ({ ...s, playing: false, currentTime: 0 }));
  }, [stopSourceNodes, releaseWakeLock]);

  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, durationRef.current));
    const ctx = audioCtxRef.current;
    const isPlaying = ctx?.state === "running";

    if (isPlaying && ctx) {
      // Restart from new position without changing playing state
      stopSourceNodes();
      startNodesAt(ctx, clamped);
    } else {
      pausedAtRef.current = clamped;
    }
    setState(s => ({ ...s, currentTime: clamped }));
  }, [stopSourceNodes, startNodesAt]);

  const skip = useCallback((seconds: number) => {
    const ctx = audioCtxRef.current;
    const current = ctx?.state === "running"
      ? Math.max(0, ctx.currentTime - startedAtRef.current)
      : pausedAtRef.current;
    seek(current + seconds);
  }, [seek]);

  const setVolume = useCallback((voice: VoiceName, volume: number) => {
    volumesRef.current[voice] = volume;
    // GainNode.gain.value works on iOS (unlike HTMLAudioElement.volume)
    const gain = gainNodesRef.current[voice];
    if (gain) gain.gain.value = volume;
    setState(s => ({
      ...s,
      voices: { ...s.voices, [voice]: { ...s.voices[voice], volume } },
    }));
  }, []);

  const loadSong = useCallback(async (songName: string) => {
    const loadId = ++loadIdRef.current;

    // Stop playback and clear state
    stopSourceNodes();
    pausedAtRef.current = 0;
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.suspend();
    VOICE_NAMES.forEach(v => { audioBuffersRef.current[v] = null; });
    durationRef.current = 0;

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

    // Create the AudioContext + GainNodes here rather than in play().
    // The context starts in "suspended" state, which is fine for decodeAudioData.
    // play() will call ctx.resume() inside the user gesture to enable audio output
    // on iOS. Using a single persistent context avoids the WebKit issue where
    // AudioBuffers become invalid after their originating context is closed.
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      VOICE_NAMES.forEach(v => {
        const gain = audioCtxRef.current!.createGain();
        gain.gain.value = volumesRef.current[v];
        gain.connect(audioCtxRef.current!.destination);
        gainNodesRef.current[v] = gain;
      });
    }
    const decodeCtx = audioCtxRef.current;

    for (const voice of VOICE_NAMES) {
      if (loadIdRef.current !== loadId) break;
      try {
        const url = makeUrl(settings.serverUrl, songName, voice);
        const response = await fetch(url, {
          headers: { "Authorization": "Basic " + btoa(`choir:${settings.password}`) },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (loadIdRef.current !== loadId) break;

        const arrayBuffer = await response.arrayBuffer();
        if (loadIdRef.current !== loadId) break;

        const buffer = await decodeCtx.decodeAudioData(arrayBuffer);
        if (loadIdRef.current !== loadId) break;

        audioBuffersRef.current[voice] = buffer;
        durationRef.current = Math.max(durationRef.current, buffer.duration);

        const waveform = extractWaveform(buffer);
        setState(s => ({
          ...s,
          duration: Math.max(s.duration, buffer.duration),
          waveforms: { ...s.waveforms, [voice]: { waveform, duration: buffer.duration } },
          voices: { ...s.voices, [voice]: { ...s.voices[voice], loading: false, error: null } },
        }));
      } catch (err: any) {
        if (loadIdRef.current !== loadId) break;
        setState(s => ({
          ...s,
          voices: { ...s.voices, [voice]: { ...s.voices[voice], loading: false, error: err.message || "Error" } },
        }));
      }
    }

  }, [settings.serverUrl, settings.password, stopSourceNodes]);

  // Re-acquire the wake lock when the page comes back to the foreground.
  // The OS automatically releases it when the screen locks or the tab is hidden.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isPlayingRef.current) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [acquireWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      stopSourceNodes();
      releaseWakeLock();
      audioCtxRef.current?.close();
    };
  }, [stopSourceNodes, releaseWakeLock]);

  return { state, loadSong, play, pause, stop, seek, skip, setVolume, voiceNames: VOICE_NAMES };
}
