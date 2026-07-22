import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { obterMeuPerfil, atualizarMeuPerfil } from "@/api/me";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { AlterarSenhaForm } from "@/components/alterar-senha-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MeuPerfilPage() {
  const { atualizarUsuario } = useAuth();
  const { data: perfil } = useQuery({ queryKey: ["me", "perfil"], queryFn: obterMeuPerfil });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [contatoEmergenciaNome, setContatoEmergenciaNome] = useState("");
  const [contatoEmergenciaTelefone, setContatoEmergenciaTelefone] = useState("");

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome);
      setEmail(perfil.email);
      setTelefone(perfil.inquilino?.telefone ?? "");
      setContatoEmergenciaNome(perfil.inquilino?.contatoEmergenciaNome ?? "");
      setContatoEmergenciaTelefone(perfil.inquilino?.contatoEmergenciaTelefone ?? "");
    }
  }, [perfil]);

  const mutSalvar = useMutation({
    mutationFn: () =>
      atualizarMeuPerfil({ nome, email, telefone, contatoEmergenciaNome, contatoEmergenciaTelefone }),
    onSuccess: (atualizado) => {
      toast.success("Perfil atualizado.");
      atualizarUsuario(atualizado);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Meu Perfil" descricao="Atualize seus dados de contato e senha de acesso." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados de contato</CardTitle>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contatoNome">Contato de emergência</Label>
            <Input
              id="contatoNome"
              value={contatoEmergenciaNome}
              onChange={(e) => setContatoEmergenciaNome(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contatoTelefone">Telefone de emergência</Label>
            <Input
              id="contatoTelefone"
              value={contatoEmergenciaTelefone}
              onChange={(e) => setContatoEmergenciaTelefone(e.target.value)}
            />
          </div>
          <Button className="w-fit" onClick={() => mutSalvar.mutate()} disabled={mutSalvar.isPending}>
            {mutSalvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senha de acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <AlterarSenhaForm />
        </CardContent>
      </Card>
    </div>
  );
}
