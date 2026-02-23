import { ScrollArea } from "@/components/ui/scroll-area";
import { Music } from "lucide-react";

interface SongListProps {
  songs: string[];
  currentSong: string | null;
  loading: boolean;
  error: string | null;
  onSelectSong: (song: string) => void;
}

export function SongList({ songs, currentSong, loading, error, onSelectSong }: SongListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <h2 className="text-lg font-serif text-foreground">Låtar</h2>
      </div>

      {error && (
        <p className="text-destructive text-sm mb-2">{error}</p>
      )}

      {songs.length === 0 && !loading && !error && (
        <p className="text-muted-foreground text-sm">
          Väntar på lösenord.
        </p>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {songs.map(song => (
            <button
              key={song}
              onClick={() => onSelectSong(song)}
              className={`w-full text-left px-3 py-3 rounded-md transition-colors flex items-center gap-2 text-base ${
                song === currentSong
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Music size={16} className={song === currentSong ? "text-primary" : "text-muted-foreground"} />
              <span className="truncate">{decodeURIComponent(song).replace(/-/g, " ")}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
