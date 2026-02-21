import { Slider } from "@/components/ui/slider";

interface TimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timeline({ currentTime, duration, onSeek }: TimelineProps) {
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-muted-foreground w-10 text-right font-mono">
        {formatTime(currentTime)}
      </span>
      <Slider
        value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
        onValueChange={([v]) => onSeek((v / 100) * duration)}
        max={100}
        step={0.1}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground w-10 font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
}
