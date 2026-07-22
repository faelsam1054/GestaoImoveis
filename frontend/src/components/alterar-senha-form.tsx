import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, mensagemErro } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";

export function AlterarSenhaForm() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const mutTrocar = useMutation({
    mutationFn: () => api.post("/auth/trocar-senha", { senhaAtual, novaSenha }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  function salvar() {
    setErro(null);
    if (novaSenha !== confirmacao) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    mutTrocar.mutate();
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="senhaAtual">Senha atual</Label>
        <PasswordInput id="senhaAtual" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <PasswordInput id="novaSenha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmacao">Confirme a nova senha</Label>
        <PasswordInput
          id="confirmacao"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button className="w-fit" onClick={salvar} disabled={mutTrocar.isPending}>
        {mutTrocar.isPending ? "Salvando..." : "Alterar senha"}
      </Button>
    </div>
  );
}
