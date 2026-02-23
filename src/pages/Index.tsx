import { useState, useEffect, useRef } from "react";

import { useSettings } from "@/hooks/useSettings";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useSongList } from "@/hooks/useSongList";
import { VoiceControl } from "@/components/VoiceControl";
import { TransportControls } from "@/components/TransportControls";
import { Timeline } from "@/components/Timeline";
import { SongList } from "@/components/SongList";
import { PasswordDialog } from "@/components/PasswordDialog";
import { AboutDialog } from "@/components/AboutDialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showAbout, setShowAbout] = useState(false);
  const { settings, setSettings } = useSettings();
  const { state, loadSong, play, pause, stop, seek, skip, setVolume, voiceNames } = useAudioPlayer(settings);
  const { songs, loading: songsLoading, error: songsError, authFailed, fetchSongs, clearSongs } = useSongList(settings);
  const { toast } = useToast();

  const [showPasswordDialog, setShowPasswordDialog] = useState(!settings.password);

  // Re-open the password dialog on auth failure
  useEffect(() => {
    if (authFailed) setShowPasswordDialog(true);
  }, [authFailed]);

  // Fetch songs on mount and whenever settings change, as long as credentials are configured
  useEffect(() => {
    if (settings.serverUrl && settings.password) {
      fetchSongs();
    } else {
      clearSongs();
    }
  }, [fetchSongs, clearSongs]);

  // Auto-load the first song once the list is available and nothing is loaded yet
  useEffect(() => {
    if (songs.length > 0 && !state.currentSong) {
      loadSong(songs[0]);
    }
  }, [songs, state.currentSong, loadSong]);

  // Show a loading notification while any voice is loading, dismiss it when done
  const dismissLoadingToast = useRef<(() => void) | null>(null);
  const isLoading = state.currentSong !== null && Object.values(state.voices).some(v => v.loading);
  useEffect(() => {
    if (isLoading) {
      const { dismiss } = toast({ title: "Laddar sång..." });
      dismissLoadingToast.current = dismiss;
    } else {
      dismissLoadingToast.current?.();
      dismissLoadingToast.current = null;
    }
  }, [isLoading]);

  const handleSelectSong = (song: string) => {
    loadSong(song);
  };

  const songDisplayName = state.currentSong
    ? decodeURIComponent(state.currentSong).replace(/-/g, " ")
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-border">
        <img src="/logo.png" alt="" className="h-6 w-auto" />
        <h1 className="text-xl font-serif text-foreground ml-2">Kör för alla</h1>
        <h2 className="text-sm font-serif text-muted-foreground ml-2">(inofficiellt verktyg)</h2>
        <div className="ml-auto">
          <Button
            variant="ghost"
            onClick={() => setShowAbout(true)}
            className="text-muted-foreground hover:text-primary"
          >
            Om denna sida
          </Button>
        </div>
      </header>

      <PasswordDialog
        open={showPasswordDialog}
        error={authFailed ? "Felaktigt lösenord." : null}
        onSubmit={(password) => {
          setSettings(s => ({ ...s, password }));
          setShowPasswordDialog(false);
        }}
      />

      <AboutDialog open={showAbout} onClose={() => setShowAbout(false)} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Song list sidebar — desktop only */}
        <aside className="hidden md:flex md:flex-col md:w-64 lg:w-72 border-r border-border p-4 h-[calc(100vh-57px)] overflow-hidden">
          <SongList
            songs={songs}
            currentSong={state.currentSong}
            loading={songsLoading}
            error={authFailed ? null : songsError}
            onSelectSong={handleSelectSong}
          />
        </aside>

        {/* Main player area */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          {/* Song selector: dropdown on mobile, title text on desktop */}
          <div className="w-full max-w-md">
            {/* Mobile dropdown */}
            <div className="md:hidden">
              <p className="text-sm font-medium text-muted-foreground mb-1">Välj sång:</p>
              <Select
                value={state.currentSong ?? ""}
                onValueChange={handleSelectSong}
                disabled={songs.length === 0}
              >
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue placeholder={songsLoading ? "Laddar låtar..." : "Väntar på lösenord..."} />
                </SelectTrigger>
                <SelectContent>
                  {songs.map(song => (
                    <SelectItem key={song} value={song} className="text-base py-3">
                      {decodeURIComponent(song).replace(/-/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop title */}
            <div className="hidden md:block text-center">
              {songDisplayName ? (
                <h2 className="text-2xl font-serif text-foreground capitalize">{songDisplayName}</h2>
              ) : (
                <p className="text-muted-foreground text-lg">Välj en låt för att börja</p>
              )}
            </div>
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
