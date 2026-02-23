import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

interface PasswordDialogProps {
  open: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
}

export function PasswordDialog({ open, error, onSubmit }: PasswordDialogProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password.trim());
      setPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm [&>button:last-child]:hidden"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Välkommen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw-input" className="text-base">
              Ange lösenordet för att komma igång
            </Label>
            <Input
              id="pw-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Lösenord"
              autoFocus
              className="bg-secondary border-border text-base h-11"
            />
          </div>
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full h-11 text-base"
            disabled={!password.trim()}
          >
            <LogIn size={18} className="mr-2" />
            Logga in
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
