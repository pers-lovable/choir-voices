import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-6 w-auto" />
            Kör för alla
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">Ickeofficiell app · Version: {__GIT_COMMIT__}</p>

        <p className="text-sm text-foreground">Sång och gitarr:</p>

        <div className="flex items-center gap-4 py-2">
          <div className="flex flex-col items-center gap-1">
            <img src="/caroline.png" alt="Caroline af Ugglas" className="h-20 w-auto rounded-md object-cover" />
            <span className="text-xs text-muted-foreground">Caroline af Ugglas</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <img src="/heinz.png" alt="Heinz Liljedahl" className="h-20 w-auto rounded-md object-cover" />
            <span className="text-xs text-muted-foreground">Heinz Liljedahl</span>
          </div>
        </div>
        Ljudfilerna från Heinz Dropbox har processats så här: 
        <ul className="list-disc list-inside text-sm text-foreground">
          <li>Grön, röd och svart orginalfil trimmades så att de börjar vid samma tidpunkt (synkning).</li>
          <li>Sång och gitarr separerades genom s.k. stemming m.h.a. <a href="https://github.com/nomadkaraoke/python-audio-separator" target="_blank" className="underline">python-audio-separator</a>. OBS det sker på bekostnad av viss ljudförsämring av sång och gitarr.</li>
          <li>Gitarrens ljudfil har plockats från svart stämmas orginalfil (efter stemmingen).</li>
        </ul>
        Appen är inte kopplad till Kör för alla utan är ett hobbyprojekt. För frågor eller feedback, besök gärna <a href="https://github.com/pers-lovable/choir-voices" target="_blank" className="">GitHub-sidan</a>.
        <a
          href="https://korforalla.se/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          korforalla.se
        </a>
      </DialogContent>
    </Dialog>
  );
}
