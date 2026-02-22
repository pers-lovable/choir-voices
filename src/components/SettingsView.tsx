import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import type { AppSettings } from "@/hooks/useSettings";

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onBack: () => void;
}

export function SettingsView({ settings, onSave, onBack }: SettingsViewProps) {
  const [draft, setDraft] = useState<AppSettings>({ ...settings });

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-serif text-foreground">Inställningar</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2" hidden={true}>
          <Label htmlFor="serverUrl" className="text-foreground">Server-URL</Label>
          <Input
            id="serverUrl"
            value={draft.serverUrl}
            onChange={e => setDraft(d => ({ ...d, serverUrl: e.target.value }))}
            placeholder="https://example.com/songs"
            className="bg-secondary border-border"
          />
          <p className="text-xs text-muted-foreground">
            URL till mappen med låtar på webbservern
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground">Lösenord</Label>
          <Input
            id="password"
            type="password"
            value={draft.password}
            onChange={e => setDraft(d => ({ ...d, password: e.target.value }))}
            placeholder="Lösenord till Heinz Dropbox"
            className="bg-secondary border-border"
          />
        </div>
      </div>

      <Button
        onClick={() => onSave(draft)}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Save size={16} className="mr-2" />
        Spara inställningar
      </Button>
    </div>
  );
}
