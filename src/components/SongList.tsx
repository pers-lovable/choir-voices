import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Settings, Info } from "lucide-react";

interface SongListProps {
  songs: string[];
  currentSong: string | null;
  loading: boolean;
  error: string | null;
  hasPassword: boolean;
  onSelectSong: (song: string) => void;
  onSettings: () => void;
  onAbout: () => void;
}

export function SongList({ songs, currentSong, loading, error, hasPassword, onSelectSong, onSettings, onAbout }: SongListProps) {
  const settingsRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!hasPassword && settingsRef.current) {
      const rect = settingsRef.current.getBoundingClientRect();
      setTipPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    } else {
      setTipPos(null);
    }
  }, [hasPassword]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-serif text-foreground">Låtar</h2>
        <div className="flex items-center gap-1">
          <div ref={settingsRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettings}
              className="text-muted-foreground hover:text-primary h-10 w-10"
            >
              <Settings size={20} />
            </Button>
          </div>
          {!hasPassword && tipPos !== null && createPortal(
            <div
              className="fixed z-50 bg-primary text-primary-foreground text-xs rounded-md px-3 py-2 w-44 shadow-lg leading-relaxed pointer-events-none"
              style={{ top: tipPos.top, right: tipPos.right }}
            >
              <div className="absolute -top-1.5 right-2.5 w-3 h-3 bg-primary rotate-45" />
              Börja med att mata in lösenordet här
            </div>,
            document.body
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onAbout}
            className="text-muted-foreground hover:text-primary h-10 w-10"
          >
            <Info size={20} />
          </Button>
        </div>
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
