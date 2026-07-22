import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { obterMeuPerfil, atualizarMeuPerfil } from "@/api/me";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

// Perfil proprio do Administrador (o Proprietario edita os dados dele na
// aba "Perfil" de Configuracoes, que usa os mesmos endpoints /me/perfil).
export function PerfilPage() {
  const { atualizarUsuario } = useAuth();
  const { data: perfil } = useQuery({ queryKey: ["me", "perfil"], queryFn: obterMeuPerfil });
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome);
      setEmail(perfil.email);
    }
  }, [perfil]);

  const mutSalvar = useMutation({
    mutationFn: () => atualizarMeuPerfil({ nome, email }),
    onSuccess: (atualizado) => {
      toast.success("Perfil atualizado.");
      atualizarUsuario(atualizado);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  return (
    <div>
      <PageHeader titulo="Meu Perfil" descricao="Atualize seus dados cadastrais." />
      <Card>
        <CardContent className="flex max-w-md flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="w-fit" onClick={() => mutSalvar.mutate()} disabled={mutSalvar.isPending}>
            {mutSalvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
