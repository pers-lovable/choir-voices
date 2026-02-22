import { useState, useEffect } from "react";
import { Settings, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useSongList } from "@/hooks/useSongList";
import { VoiceControl } from "@/components/VoiceControl";
import { TransportControls } from "@/components/TransportControls";
import { Timeline } from "@/components/Timeline";
import { SongList } from "@/components/SongList";
import { SettingsView } from "@/components/SettingsView";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [showSettings, setShowSettings] = useState(false);
  const { settings, setSettings } = useSettings();
  const { state, loadSong, play, pause, stop, seek, skip, setVolume, voiceNames } = useAudioPlayer(settings);
  const { songs, loading: songsLoading, error: songsError, fetchSongs } = useSongList(settings);
  const { toast } = useToast();

  // Fetch songs on mount and whenever settings change, as long as credentials are configured
  useEffect(() => {
    if (settings.serverUrl && settings.password) {
      fetchSongs();
    }
  }, [fetchSongs]);

  const handleSelectSong = (song: string) => {
    loadSong(song);
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-background">
        <SettingsView
          settings={settings}
          onSave={(s) => {
            setSettings(s);
            toast({ title: "Inställningar sparade" });
            setShowSettings(false);
          }}
          onBack={() => setShowSettings(false)}
        />
      </div>
    );
  }

  const songDisplayName = state.currentSong
    ? decodeURIComponent(state.currentSong).replace(/-/g, " ")
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Music2 size={24} className="text-primary" />
          <h1 className="text-xl font-serif text-foreground">Kör för alla</h1>
          <h2>- ickeofficiell app</h2>
          <a href="https://korforalla.se/" target="_blank" rel="noopener noreferrer" className="ml-4 text-sm text-muted-foreground hover:text-foreground">
            korforalla.se
          </a>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings size={20} />
        </Button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Song list sidebar */}
        <aside className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-border p-4 md:h-[calc(100vh-57px)] overflow-hidden flex flex-col">
          <SongList
            songs={songs}
            currentSong={state.currentSong}
            loading={songsLoading}
            error={songsError}
            onSelectSong={handleSelectSong}
            onRefresh={fetchSongs}
          />
        </aside>

        {/* Main player area */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          {/* Current song title */}
          <div className="text-center">
            {songDisplayName ? (
              <h2 className="text-2xl font-serif text-foreground capitalize">{songDisplayName}</h2>
            ) : (
              <p className="text-muted-foreground text-lg">Välj en låt för att börja</p>
            )}
          </div>

          {/* Voice controls */}
          <div className="w-full max-w-md space-y-2">
            {voiceNames.map(name => (
              <VoiceControl
                key={name}
                voice={state.voices[name]}
                onVolumeChange={setVolume}
                waveformData={state.waveforms[name]}
                currentTime={state.currentTime}
                duration={state.duration}
              />
            ))}
          </div>

          {/* Timeline */}
          <div className="w-full max-w-md">
            <Timeline
              currentTime={state.currentTime}
              duration={state.duration}
              onSeek={seek}
            />
          </div>

          {/* Transport */}
          <TransportControls
            playing={state.playing}
            disabled={!state.currentSong || Object.values(state.voices).some(v => v.loading)}
            onPlay={play}
            onPause={pause}
            onStop={stop}
            onSkipBack={() => skip(-10)}
            onSkipForward={() => skip(10)}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
