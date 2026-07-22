import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { obterMeuPerfil, atualizarMeuPerfil } from "@/api/me";
import { listarAuditoria } from "@/api/auditoria";
import { mensagemErro } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { formatarDataHora } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { AlterarSenhaForm } from "@/components/alterar-senha-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function AbaPerfil() {
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
  );
}

function AbaSenha() {
  return (
    <Card>
      <CardContent className="pt-6">
        <AlterarSenhaForm />
      </CardContent>
    </Card>
  );
}

function AbaAuditoria() {
  const { data: resultado, isLoading } = useQuery({ queryKey: ["auditoria"], queryFn: () => listarAuditoria() });

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {resultado?.dados.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">{formatarDataHora(log.createdAt)}</TableCell>
                <TableCell className="text-xs">{log.usuario?.nome ?? "Sistema"}</TableCell>
                <TableCell className="text-xs font-mono">{log.acao}</TableCell>
                <TableCell className="text-xs">{log.entidade}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ConfiguracoesPage() {
  return (
    <div>
      <PageHeader titulo="Configurações" descricao="Dados do proprietário, senha de acesso e logs de auditoria." />
      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="senha">Senha</TabsTrigger>
          <TabsTrigger value="auditoria">Logs de Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="perfil" className="mt-4">
          <AbaPerfil />
        </TabsContent>
        <TabsContent value="senha" className="mt-4">
          <AbaSenha />
        </TabsContent>
        <TabsContent value="auditoria" className="mt-4">
          <AbaAuditoria />
        </TabsContent>
      </Tabs>
    </div>
  );
}
