import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, RefreshCw, Loader2, Settings, Info } from "lucide-react";

interface SongListProps {
  songs: string[];
  currentSong: string | null;
  loading: boolean;
  error: string | null;
  onSelectSong: (song: string) => void;
  onRefresh: () => void;
  onSettings: () => void;
  onAbout: () => void;
}

export function SongList({ songs, currentSong, loading, error, onSelectSong, onRefresh, onSettings, onAbout }: SongListProps) {
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            className="text-muted-foreground hover:text-primary h-8 w-8"
          >
            <Settings size={16} />
          </Button>
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
