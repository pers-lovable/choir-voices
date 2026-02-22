import { useRef, useEffect, useCallback } from "react";

// Seconds of audio visible across the full canvas width
const ZOOM_SECONDS = 20;

// Hardcoded to match the CSS custom properties in index.css
const VOICE_COLORS: Record<string, string> = {
  "grön": "hsl(140, 50%, 45%)",
  "röd": "hsl(0, 65%, 55%)",
  "svart": "hsl(220, 10%, 50%)",
  "instrument": "hsl(280, 40%, 55%)",
};

interface WaveformDisplayProps {
  voiceName: string;
  waveformData: Float32Array | null;
  /** Duration of this voice's decoded buffer — used as the denominator for
   *  sample-index mapping so the waveform scrolls in lockstep with the audio
   *  even when voices have slightly different encoded lengths. */
  waveformDuration: number;
  currentTime: number;
  duration: number;
}

export function WaveformDisplay({ voiceName, waveformData, waveformDuration, currentTime, duration }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = VOICE_COLORS[voiceName] ?? "hsl(220, 10%, 50%)";

  // Keep latest draw params in a ref so the stable draw() callback can read them
  const paramsRef = useRef({ waveformData, waveformDuration, currentTime, duration, color });
  paramsRef.current = { waveformData, waveformDuration, currentTime, duration, color };

  const draw = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { waveformData, waveformDuration, currentTime, duration, color } = paramsRef.current;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);
    const playheadX = Math.floor(w / 2);

    if (!waveformData || duration === 0 || waveformDuration === 0) {
      // Empty state: dim centre line + playhead
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, h / 2 - 1, w, 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(playheadX, 0, 1, h);
      return;
    }

    const pixelsPerSecond = w / ZOOM_SECONDS;
    const samples = waveformData.length;

    for (let x = 0; x < w; x++) {
      const t = currentTime + (x - playheadX) / pixelsPerSecond;
      if (t < 0 || t > duration) continue;
      // waveformDuration is this voice's own buffer.duration — keeps sample-index
      // mapping in lockstep with the audio even when voices differ in length.
      const si = Math.min(samples - 1, Math.floor((t / waveformDuration) * (samples - 1)));
      const amplitude = waveformData[si];
      const barH = Math.max(1, amplitude * h * 0.9);
      ctx.globalAlpha = x <= playheadX ? 0.85 : 0.3;
      ctx.fillStyle = color;
      ctx.fillRect(x, (h - barH) / 2, 1, barH);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(playheadX, 0, 1, h);
  }, []);

  // ResizeObserver: sets canvas pixel dimensions from actual layout, then redraws.
  // This is more reliable than reading clientWidth inside useEffect, which can
  // return 0 in Firefox before the browser resolves canvas intrinsic dimensions.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          draw(canvas);
        }
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [voiceName, draw]);

  // Redraw when data or playback position changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    draw(canvas);
  }, [waveformData, waveformDuration, currentTime, duration, color, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10 rounded-sm"
    />
  );
}
