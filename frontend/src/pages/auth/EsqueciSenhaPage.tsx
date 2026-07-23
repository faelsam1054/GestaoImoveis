import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound, ArrowLeft } from "lucide-react";
import { api, mensagemErro } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RespostaEsqueciSenha {
  mensagem: string;
  tokenDev?: string;
}

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resposta, setResposta] = useState<RespostaEsqueciSenha | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { data } = await api.post<RespostaEsqueciSenha>("/auth/esqueci-senha", { email });
      setResposta(data);
    } catch (err) {
      setErro(mensagemErro(err, "Não foi possível processar o pedido."));
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
          <CardTitle className="text-xl">Esqueceu sua senha?</CardTitle>
          <CardDescription>Informe seu email para receber um link de redefinição.</CardDescription>
        </CardHeader>
        <CardContent>
          {resposta ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{resposta.mensagem}</p>
              {resposta.tokenDev && (
                <div className="flex flex-col gap-2 rounded-md bg-muted p-3 text-xs">
                  <p className="text-muted-foreground">
                    Ambiente de desenvolvimento: nenhum email é enviado de verdade. Use o link abaixo para
                    redefinir a senha.
                  </p>
                  <Link
                    to={`/redefinir-senha?token=${resposta.tokenDev}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Redefinir minha senha agora
                  </Link>
                </div>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/login">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao login
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
