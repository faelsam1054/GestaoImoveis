import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, mensagemErro } from "@/lib/api-client";
import { rotaInicial } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TrocarSenhaPage() {
  const { usuario, atualizarUsuario, logout } = useAuth();
  const navigate = useNavigate();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!usuario) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (novaSenha !== confirmacao) {
      setErro("A confirmação de senha não confere com a nova senha.");
      return;
    }
    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      await api.post("/auth/trocar-senha", { senhaAtual, novaSenha });
      // Trocar a senha revoga todas as sessoes no backend; refaz o login localmente.
      atualizarUsuario({ ...usuario!, precisaTrocarSenha: false });
      navigate(rotaInicial(usuario!), { replace: true });
    } catch (err) {
      setErro(mensagemErro(err, "Não foi possível trocar a senha."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-success/15 blur-3xl"
      />
      <Card className="relative w-full max-w-sm shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Defina uma nova senha</CardTitle>
          <CardDescription>
            {usuario.precisaTrocarSenha
              ? "Este é seu primeiro acesso. Troque a senha temporária antes de continuar."
              : "Altere sua senha de acesso."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="senhaAtual">Senha atual</Label>
              <PasswordInput
                id="senhaAtual"
                autoComplete="current-password"
                required
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <PasswordInput
                id="novaSenha"
                autoComplete="new-password"
                required
                minLength={8}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmacao">Confirme a nova senha</Label>
              <PasswordInput
                id="confirmacao"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Salvando..." : "Salvar nova senha"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => void logout()}>
              Cancelar e sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
