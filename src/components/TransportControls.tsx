import { Button } from "@/components/ui/button";
import { Play, Pause, Square, SkipBack, SkipForward } from "lucide-react";

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
        className="text-foreground hover:text-primary"
        title="-10 sec"
      >
        <SkipBack size={20} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onStop}
        disabled={disabled}
        className="text-foreground hover:text-primary"
      >
        <Square size={18} />
      </Button>

      <Button
        size="icon"
        onClick={playing ? onPause : onPlay}
        disabled={disabled}
        className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
      >
        {playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onSkipForward}
        disabled={disabled}
        className="text-foreground hover:text-primary"
        title="+10 sec"
      >
        <SkipForward size={20} />
      </Button>
    </div>
  );
}
