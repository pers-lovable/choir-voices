import { useRef, useEffect } from "react";

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
  currentTime: number;
  duration: number;
}

export function WaveformDisplay({ voiceName, waveformData, currentTime, duration }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = VOICE_COLORS[voiceName] ?? "hsl(220, 10%, 50%)";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sync canvas pixel dimensions to its rendered size
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    const playheadX = Math.floor(w / 2);

    if (!waveformData || duration === 0) {
      // Empty state: dim centre line + playhead
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, h / 2 - 1, w, 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(playheadX, 0, 1, h);
      return;
    }

    const pixelsPerSecond = w / ZOOM_SECONDS;
    const samples = waveformData.length;

    // Draw waveform bars — past (left of playhead) at full opacity, future dimmer
    for (let x = 0; x < w; x++) {
      const t = currentTime + (x - playheadX) / pixelsPerSecond;
      if (t < 0 || t > duration) continue;
      const si = Math.floor((t / duration) * (samples - 1));
      const amplitude = waveformData[si];
      const barH = Math.max(1, amplitude * h * 0.9);
      ctx.globalAlpha = x <= playheadX ? 0.85 : 0.3;
      ctx.fillStyle = color;
      ctx.fillRect(x, (h - barH) / 2, 1, barH);
    }
    ctx.globalAlpha = 1;

    // Playhead
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(playheadX, 0, 1, h);
  }, [waveformData, currentTime, duration, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10 rounded-sm"
    />
  );
}
