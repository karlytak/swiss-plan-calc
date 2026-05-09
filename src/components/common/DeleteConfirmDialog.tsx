import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/contexts/LanguageContext";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Texte exact que l'utilisateur doit retaper pour confirmer. */
  expectedText: string;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  expectedText,
  title,
  description,
  confirmLabel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const t = useT();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed.trim() === expectedText.trim();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>{description}</div>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm-input" className="text-xs text-foreground">
                  {t("delete.confirm_prompt")}{" "}
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    {expectedText}
                  </span>
                </Label>
                <Input
                  id="delete-confirm-input"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches}
            onClick={(e) => {
              if (!matches) {
                e.preventDefault();
                return;
              }
              void onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {confirmLabel ?? t("delete.default_label")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

