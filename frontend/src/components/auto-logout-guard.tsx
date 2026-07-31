import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import { SESSION_CONFIG } from "@/config/session";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Monta dentro de ProtectedRoute (cobre os tres perfis com um unico ponto de
// integracao, incluindo /trocar-senha que fica fora do AppShell). So conta
// tempo de atividade real do usuario - ver use-idle-timer.ts.
export function AutoLogoutGuard() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const encerrarPorInatividade = useCallback(() => {
    void logout();
    navigate("/login", { replace: true });
    toast.info("Sessão expirada por inatividade");
  }, [logout, navigate]);

  const { avisando, restanteMs, continuarConectado } = useIdleTimer({
    timeout: SESSION_CONFIG.TIMEOUT,
    warningBefore: SESSION_CONFIG.WARNING_BEFORE,
    onIdle: encerrarPorInatividade,
    ativo: Boolean(usuario),
  });

  if (!usuario) return null;

  const segundosRestantes = Math.ceil(restanteMs / 1000);

  return (
    <Dialog open={avisando} onOpenChange={(open) => !open && continuarConectado()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Clock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Sua sessão está expirando</DialogTitle>
          <DialogDescription className="text-center">
            Você será desconectado em {segundosRestantes}s por inatividade.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={continuarConectado} className="w-full sm:w-auto">
            Continuar Conectado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
