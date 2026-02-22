import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";

interface TransportControlsProps {
  playing: boolean;
  disabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

export function TransportControls({
  playing,
  disabled,
  onPlay,
  onPause,
  onStop,
  onSkipBack,
  onSkipForward,
}: TransportControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onSkipBack}
        disabled={disabled}
        className="text-foreground hover:text-primary text-sm font-semibold h-11 w-12"
      >
        −10s
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onStop}
        disabled={disabled}
        className="text-foreground hover:text-primary h-11 w-11"
      >
        <Square size={22} />
      </Button>

      <Button
        size="icon"
        onClick={playing ? onPause : onPlay}
        disabled={disabled}
        className="h-16 w-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
      >
        {playing ? <Pause size={28} /> : <Play size={28} className="ml-0.5" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onSkipForward}
        disabled={disabled}
        className="text-foreground hover:text-primary text-sm font-semibold h-11 w-12"
      >
        +10s
      </Button>
    </div>
  );
}
