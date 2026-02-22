import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, RefreshCw, Loader2, Settings, Info } from "lucide-react";

interface SongListProps {
  songs: string[];
  currentSong: string | null;
  loading: boolean;
  error: string | null;
  hasPassword: boolean;
  onSelectSong: (song: string) => void;
  onRefresh: () => void;
  onSettings: () => void;
  onAbout: () => void;
}

export function SongList({ songs, currentSong, loading, error, hasPassword, onSelectSong, onRefresh, onSettings, onAbout }: SongListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-serif text-foreground">Låtar</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="text-muted-foreground hover:text-primary h-8 w-8"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettings}
              className="text-muted-foreground hover:text-primary h-8 w-8"
            >
              <Settings size={16} />
            </Button>
            {!hasPassword && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-primary text-primary-foreground text-xs rounded-md px-3 py-2 w-44 shadow-lg leading-relaxed pointer-events-none">
                <div className="absolute -top-1.5 right-2.5 w-3 h-3 bg-primary rotate-45" />
                Börja med att mata in lösenordet här
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAbout}
            className="text-muted-foreground hover:text-primary h-8 w-8"
          >
            <Info size={16} />
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-destructive text-sm mb-2">{error}</p>
      )}

      {songs.length === 0 && !loading && !error && (
        <p className="text-muted-foreground text-sm">
          Inga låtar hittades. Kontrollera inställningarna och tryck på uppdatera.
        </p>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {songs.map(song => (
            <button
              key={song}
              onClick={() => onSelectSong(song)}
              className={`w-full text-left px-3 py-2.5 rounded-md transition-colors flex items-center gap-2 text-sm ${
                song === currentSong
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Music size={14} className={song === currentSong ? "text-primary" : "text-muted-foreground"} />
              <span className="truncate">{decodeURIComponent(song).replace(/-/g, " ")}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
