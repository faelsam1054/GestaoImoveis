import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemErro } from "@/lib/api-client";
import { rotaInicial } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    const destino = usuario.precisaTrocarSenha
      ? "/trocar-senha"
      : ((location.state as { from?: Location } | null)?.from?.pathname ?? rotaInicial(usuario));
    return <Navigate to={destino} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const usuarioLogado = await login(email, senha);
      const destino = usuarioLogado.precisaTrocarSenha ? "/trocar-senha" : rotaInicial(usuarioLogado);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(mensagemErro(err, "Nao foi possivel entrar. Verifique suas credenciais."));
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
            <Home className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Gestão de Aluguéis</CardTitle>
          <CardDescription>Entre com seu email e senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link to="/esqueci-senha" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                  Esqueceu sua senha?
                </Link>
              </div>
              <PasswordInput
                id="senha"
                autoComplete="current-password"
                required
                className="h-11"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            {erro && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
            )}
            <Button type="submit" size="lg" className="mt-1 w-full" disabled={enviando}>
              {enviando ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
