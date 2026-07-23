import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, KeyRound, Crown } from "lucide-react";
import {
  listarProprietarios,
  criarProprietario,
  desativarProprietario,
  reativarProprietario,
  excluirProprietario,
  type ProprietarioInput,
} from "@/api/proprietarios";
import type { CredenciaisTemporarias } from "@/api/inquilinos";
import { useAuth } from "@/contexts/AuthContext";
import type { Proprietario } from "@/types/domain";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DoubleConfirmDialog } from "@/components/double-confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { MobileRowCard, MobileRowCardHeader, MobileRowField, MobileRowActions } from "@/components/mobile-row-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FORM_VAZIO: ProprietarioInput = { nome: "", email: "", telefone: "" };

export function ProprietariosPage() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<ProprietarioInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<CredenciaisTemporarias | null>(null);
  const [desativando, setDesativando] = useState<Proprietario | null>(null);
  const [excluindo, setExcluindo] = useState<Proprietario | null>(null);

  const { data: proprietarios, isLoading } = useQuery({
    queryKey: ["proprietarios"],
    queryFn: listarProprietarios,
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["proprietarios"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: ProprietarioInput) => criarProprietario(input),
    onSuccess: async (resposta) => {
      await invalidar();
      setDialogAberto(false);
      setCredenciais(resposta.credenciaisTemporarias);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutDesativar = useMutation({
    mutationFn: (id: string) => desativarProprietario(id),
    onSuccess: async () => {
      toast.success("Proprietário desativado.");
      await invalidar();
      setDesativando(null);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setDesativando(null);
    },
  });

  const mutReativar = useMutation({
    mutationFn: (id: string) => reativarProprietario(id),
    onSuccess: async () => {
      toast.success("Proprietário reativado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => excluirProprietario(id),
    onSuccess: async () => {
      toast.success("Proprietário excluído definitivamente.");
      await invalidar();
      setExcluindo(null);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setExcluindo(null);
    },
  });

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  const lista = proprietarios ?? [];

  return (
    <div>
      <PageHeader
        titulo="Proprietários"
        descricao="Contas com acesso total ao sistema, iguais ao seu."
        acoes={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo Proprietário
          </Button>
        }
      />

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}
      {!isLoading && lista.length === 0 && (
        <EmptyState
          icon={Crown}
          titulo="Nenhum outro proprietário cadastrado"
          descricao="Cadastre outro Proprietário para dividir o acesso total ao sistema."
        />
      )}

      {!isLoading && lista.length > 0 && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((proprietario) => {
                  const souEu = proprietario.id === usuario?.id;
                  return (
                    <TableRow key={proprietario.id}>
                      <TableCell className="font-medium">
                        {proprietario.nome}
                        {souEu && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{proprietario.email}</TableCell>
                      <TableCell className="text-muted-foreground">{proprietario.telefone ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={proprietario.ativo ? "ativo" : "inativo"} />
                      </TableCell>
                      <TableCell className="text-right">
                        {!souEu && (
                          <>
                            {proprietario.ativo ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 dark:text-amber-400"
                                onClick={() => setDesativando(proprietario)}
                              >
                                Desativar
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-success"
                                onClick={() => mutReativar.mutate(proprietario.id)}
                              >
                                Ativar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setExcluindo(proprietario)}
                            >
                              Excluir
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
            {lista.map((proprietario) => {
              const souEu = proprietario.id === usuario?.id;
              return (
                <MobileRowCard key={proprietario.id}>
                  <MobileRowCardHeader>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {proprietario.nome}
                        {souEu && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{proprietario.email}</p>
                    </div>
                    <StatusBadge status={proprietario.ativo ? "ativo" : "inativo"} />
                  </MobileRowCardHeader>
                  <MobileRowField label="Telefone" value={proprietario.telefone ?? "—"} />
                  {!souEu && (
                    <MobileRowActions>
                      {proprietario.ativo ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 dark:text-amber-400"
                          onClick={() => setDesativando(proprietario)}
                        >
                          Desativar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-success"
                          onClick={() => mutReativar.mutate(proprietario.id)}
                        >
                          Ativar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setExcluindo(proprietario)}
                      >
                        Excluir
                      </Button>
                    </MobileRowActions>
                  )}
                </MobileRowCard>
              );
            })}
          </div>
        </>
      )}

      {/* Novo proprietario */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Proprietário</DialogTitle>
            <DialogDescription>
              Um login será criado com senha temporária e acesso total ao sistema, igual ao seu.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setErro(null);
                mutCriar.mutate(form);
              }}
              disabled={mutCriar.isPending || !form.nome || !form.email}
            >
              {mutCriar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credenciais reveladas */}
      <Dialog open={Boolean(credenciais)} onOpenChange={(open) => !open && setCredenciais(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Credenciais de acesso
            </DialogTitle>
            <DialogDescription>
              Repasse estas credenciais temporárias. A senha só é exibida uma vez (um email também foi enviado).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 rounded-md bg-muted p-4 font-mono text-sm">
            <span>
              <strong>Email:</strong> {credenciais?.email}
            </span>
            <span>
              <strong>Senha temporária:</strong> {credenciais?.senhaTemporaria}
            </span>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredenciais(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(desativando)}
        onOpenChange={(open) => !open && setDesativando(null)}
        titulo="Desativar proprietário"
        descricao={`Isso desativa o login de ${desativando?.nome ?? ""}. Ele não conseguirá mais acessar o sistema.`}
        textoConfirmar="Desativar"
        destrutivo
        onConfirm={() => desativando && mutDesativar.mutate(desativando.id)}
      />

      <DoubleConfirmDialog
        open={Boolean(excluindo)}
        onOpenChange={(open) => !open && setExcluindo(null)}
        titulo="Excluir proprietário definitivamente"
        descricao={`Esta ação remove ${excluindo?.nome ?? ""} permanentemente do sistema. Só é possível se ele não tiver nenhuma ação registrada (contratos criados/aprovados, auditoria).`}
        confirmLabel={`Digite o email (${excluindo?.email ?? ""}) para confirmar`}
        confirmValue={excluindo?.email ?? ""}
        textoConfirmar="Excluir definitivamente"
        pending={mutExcluir.isPending}
        onConfirm={() => excluindo && mutExcluir.mutate(excluindo.id)}
      />
    </div>
  );
}
