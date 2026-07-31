import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NOME_APP, TAGLINE_APP } from "@/components/logo";
import { mensagemErro } from "@/lib/api-client";
import { rotaInicial } from "@/lib/nav";
import { scaleIn, staggerContainer, staggerItem, fadeIn, EASE_OUT } from "@/lib/animations";
import { WallpaperBackground } from "@/components/wallpaper-background";
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
  const [sucesso, setSucesso] = useState(false);

  // "&& !sucesso": durante o proprio fluxo de login desta pagina, o contexto de
  // auth fica com usuario definido assim que login() resolve, mas queremos
  // segurar aqui ate o check de sucesso terminar (ver handleSubmit) antes de
  // navegar - sem isso esse guard redireciona na hora, antes da animacao.
  if (usuario && !sucesso) {
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
      // Mostra o check de sucesso por um instante antes de navegar - puramente
      // visual, a autenticacao ja aconteceu de verdade na linha acima.
      setSucesso(true);
      setTimeout(() => navigate(destino, { replace: true }), 550);
    } catch (err) {
      setErro(mensagemErro(err, "Nao foi possivel entrar. Verifique suas credenciais."));
      setEnviando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <WallpaperBackground variant="login" parallax />

      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-md mx-4 sm:mx-0"
      >
        <Card className="border-white/40 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95">
          <CardHeader className="flex flex-col items-center gap-2 p-8 pb-0 text-center">
            <motion.div
              variants={staggerItem}
              initial="hidden"
              animate="visible"
              className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm dark:bg-sky-400 dark:text-slate-950"
            >
              <AnimatePresence mode="wait" initial={false}>
                {sucesso ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                  >
                    <Check className="h-7 w-7" />
                  </motion.span>
                ) : (
                  <motion.span key="home" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Home className="h-7 w-7" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
            <CardTitle className="text-2xl">{NOME_APP}</CardTitle>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2, ease: EASE_OUT }}
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              {TAGLINE_APP}
            </motion.p>
            <CardDescription>Entre com seu email e senha</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <motion.form
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-4"
              onSubmit={handleSubmit}
            >
              <motion.div variants={staggerItem} className="flex flex-col gap-2">
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
              </motion.div>
              <motion.div variants={staggerItem} className="flex flex-col gap-2">
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
              </motion.div>
              {erro && (
                <motion.p
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {erro}
                </motion.p>
              )}
              <motion.div variants={staggerItem}>
                <Button type="submit" size="lg" className="mt-1 w-full" disabled={enviando || sucesso}>
                  {sucesso ? "Bem-vindo!" : enviando ? "Entrando..." : "Entrar"}
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
