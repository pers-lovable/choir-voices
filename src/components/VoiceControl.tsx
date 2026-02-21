import { Slider } from "@/components/ui/slider";
import type { VoiceName, VoiceState } from "@/hooks/useAudioPlayer";
import { Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";

interface VoiceControlProps {
  voice: VoiceState;
  onVolumeChange: (voice: VoiceName, volume: number) => void;
}

const voiceColorClass: Record<VoiceName, string> = {
  "grön": "bg-voice-gron",
  "röd": "bg-voice-rod",
  "svart": "bg-voice-svart",
};

const voiceTextClass: Record<VoiceName, string> = {
  "grön": "voice-gron",
  "röd": "voice-rod",
  "svart": "voice-svart",
};

export function VoiceControl({ voice, onVolumeChange }: VoiceControlProps) {
  const isMuted = voice.volume === 0;

  return (
    <div className="flex items-center gap-4 rounded-lg bg-secondary/50 px-4 py-3">
      <div className="flex items-center gap-2 w-20">
        <div className={`w-2.5 h-2.5 rounded-full ${voiceColorClass[voice.name]} ${voice.loading ? "animate-pulse-glow" : ""}`} />
        <span className={`text-sm font-semibold capitalize ${voiceTextClass[voice.name]}`}>
          {voice.name}
        </span>
      </div>

      <button
        onClick={() => onVolumeChange(voice.name, isMuted ? 0.8 : 0)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <Slider
        value={[voice.volume * 100]}
        onValueChange={([v]) => onVolumeChange(voice.name, v / 100)}
        max={100}
        step={1}
        className="flex-1"
      />

      <span className="text-xs text-muted-foreground w-8 text-right">
        {Math.round(voice.volume * 100)}%
      </span>

      {voice.loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
      {voice.error && (
        <span className="text-destructive text-xs flex items-center gap-1">
          <AlertCircle size={14} />
          {voice.error}
        </span>
      )}
    </div>
  );
}
