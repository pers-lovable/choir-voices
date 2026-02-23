import { Slider } from "@/components/ui/slider";
import type { VoiceName, VoiceState, WaveformData } from "@/hooks/useAudioPlayer";
import { Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";
import { WaveformDisplay } from "./WaveformDisplay";

interface VoiceControlProps {
  voice: VoiceState;
  onVolumeChange: (voice: VoiceName, volume: number) => void;
  waveformData: WaveformData | null;
  currentTime: number;
  duration: number;
}

const voiceColorClass: Record<VoiceName, string> = {
  "grön": "bg-voice-gron",
  "röd": "bg-voice-rod",
  "svart": "bg-voice-svart",
  "instrument": "bg-voice-instrument",
};

const voiceTextClass: Record<VoiceName, string> = {
  "grön": "voice-gron",
  "röd": "voice-rod",
  "svart": "voice-svart",
  "instrument": "voice-instrument",
};

const voiceDisplayName: Record<VoiceName, string> = {
  "grön": "Grön",
  "röd": "Röd",
  "svart": "Svart",
  "instrument": "Gitarr",
};

export function VoiceControl({ voice, onVolumeChange, waveformData, currentTime, duration }: VoiceControlProps) {
  const isMuted = voice.volume === 0;

  return (
    <div className="rounded-lg bg-secondary/50 px-3 py-2 space-y-2 md:px-4 md:py-3">
      <WaveformDisplay
        voiceName={voice.name}
        waveformData={waveformData?.waveform ?? null}
        waveformDuration={waveformData?.duration ?? 0}
        currentTime={currentTime}
        duration={duration}
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 w-14">
          <div className={`w-3 h-3 rounded-full shrink-0 ${voiceColorClass[voice.name]} ${voice.loading ? "animate-pulse-glow" : ""}`} />
          <span className={`text-base font-semibold ${voiceTextClass[voice.name]}`}>
            {voiceDisplayName[voice.name]}
          </span>
        </div>

        <button
          onClick={() => onVolumeChange(voice.name, isMuted ? 0.8 : 0)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>

        <Slider
          value={[voice.volume * 100]}
          onValueChange={([v]) => onVolumeChange(voice.name, v / 100)}
          max={100}
          step={1}
          className="flex-1"
        />

        <span className="text-sm text-muted-foreground w-8 text-right">
          {Math.round(voice.volume * 100)}%
        </span>

        {voice.loading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
        {voice.error && (
          <span className="text-destructive text-sm flex items-center gap-1">
            <AlertCircle size={16} />
            {voice.error}
          </span>
        )}
      </div>
    </div>
  );
}
