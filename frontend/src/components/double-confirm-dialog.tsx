import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DoubleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  confirmLabel: string;
  confirmValue: string;
  textoConfirmar?: string;
  pending?: boolean;
  onConfirm: () => void;
}

// Confirmacao reforcada para exclusoes definitivas (hard delete), usada
// quando uma ConfirmDialog simples nao basta: checkbox + digitar um valor
// exato (email, ID etc.) antes de liberar o botao.
export function DoubleConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  confirmLabel,
  confirmValue,
  textoConfirmar = "Excluir definitivamente",
  pending = false,
  onConfirm,
}: DoubleConfirmDialogProps) {
  const [entendido, setEntendido] = useState(false);
  const [digitado, setDigitado] = useState("");

  useEffect(() => {
    if (!open) {
      setEntendido(false);
      setDigitado("");
    }
  }, [open]);

  const liberado = entendido && digitado.trim().toLowerCase() === confirmValue.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={entendido} onCheckedChange={(v) => setEntendido(v === true)} className="mt-0.5" />
            Entendo que esta ação é permanente e não pode ser desfeita.
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmacao-dupla-input">{confirmLabel}</Label>
            <Input
              id="confirmacao-dupla-input"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              placeholder={confirmValue}
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!liberado || pending} onClick={onConfirm}>
            {pending ? "Excluindo..." : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
