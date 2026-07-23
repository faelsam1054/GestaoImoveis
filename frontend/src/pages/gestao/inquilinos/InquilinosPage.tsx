import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, KeyRound, Users } from "lucide-react";
import {
  listarInquilinos,
  criarInquilino,
  atualizarInquilino,
  desativarInquilino,
  ativarInquilino,
  excluirInquilino,
  restaurarInquilino,
  resetarSenhaInquilino,
  type InquilinoInput,
  type CredenciaisTemporarias,
} from "@/api/inquilinos";
import { useAuth } from "@/contexts/AuthContext";
import type { Inquilino } from "@/types/domain";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { MobileRowCard, MobileRowCardHeader, MobileRowField, MobileRowActions } from "@/components/mobile-row-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FORM_VAZIO: InquilinoInput = {
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  contatoEmergenciaNome: "",
  contatoEmergenciaTelefone: "",
};

export function InquilinosPage() {
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarInquilinos;
  const ehProprietario = usuario?.role === "proprietario";
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [apenasExcluidos, setApenasExcluidos] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Inquilino | null>(null);
  const [form, setForm] = useState<InquilinoInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<CredenciaisTemporarias | null>(null);
  const [desativando, setDesativando] = useState<Inquilino | null>(null);
  const [excluindo, setExcluindo] = useState<Inquilino | null>(null);
  const [resetando, setResetando] = useState<Inquilino | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["inquilinos", busca, apenasExcluidos],
    queryFn: () => listarInquilinos({ busca: busca || undefined, apenasExcluidos: apenasExcluidos || undefined }),
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["inquilinos"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: InquilinoInput) => criarInquilino(input),
    onSuccess: async (resposta) => {
      await invalidar();
      setDialogAberto(false);
      setCredenciais(resposta.credenciaisTemporarias);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<InquilinoInput> }) => atualizarInquilino(id, input),
    onSuccess: async () => {
      toast.success("Inquilino atualizado.");
      await invalidar();
      setDialogAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutDesativar = useMutation({
    mutationFn: (id: string) => desativarInquilino(id),
    onSuccess: async () => {
      toast.success("Inquilino desativado.");
      await invalidar();
      setDesativando(null);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutAtivar = useMutation({
    mutationFn: (id: string) => ativarInquilino(id),
    onSuccess: async () => {
      toast.success("Inquilino ativado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => excluirInquilino(id),
    onSuccess: async () => {
      toast.success("Inquilino excluído.");
      await invalidar();
      setExcluindo(null);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setExcluindo(null);
    },
  });

  const mutRestaurar = useMutation({
    mutationFn: (id: string) => restaurarInquilino(id),
    onSuccess: async () => {
      toast.success("Inquilino restaurado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutResetarSenha = useMutation({
    mutationFn: (id: string) => resetarSenhaInquilino(id),
    onSuccess: (resposta) => {
      setResetando(null);
      setCredenciais(resposta.credenciaisTemporarias);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setResetando(null);
    },
  });

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(inquilino: Inquilino) {
    setEditando(inquilino);
    setForm({
      nome: inquilino.usuario?.nome ?? "",
      email: inquilino.usuario?.email ?? "",
      cpf: inquilino.cpf,
      telefone: inquilino.telefone,
      contatoEmergenciaNome: inquilino.contatoEmergenciaNome ?? "",
      contatoEmergenciaTelefone: inquilino.contatoEmergenciaTelefone ?? "",
    });
    setErro(null);
    setDialogAberto(true);
  }

  function salvar() {
    setErro(null);
    if (editando) {
      const { cpf: _cpf, ...editavel } = form;
      mutAtualizar.mutate({ id: editando.id, input: editavel });
    } else {
      mutCriar.mutate(form);
    }
  }

  const salvando = mutCriar.isPending || mutAtualizar.isPending;
  const inquilinos = resultado?.dados ?? [];

  return (
    <div>
      <PageHeader
        titulo="Inquilinos"
        descricao="Cadastro dos inquilinos e seus dados de contato."
        acoes={
          podeEditar ? (
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Novo Inquilino
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            className="pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {ehProprietario && (
          <label className="flex items-center gap-2 whitespace-nowrap px-1 text-sm">
            <Checkbox checked={apenasExcluidos} onCheckedChange={(v) => setApenasExcluidos(v === true)} />
            Mostrar excluídos
          </label>
        )}
      </div>

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}
      {!isLoading && inquilinos.length === 0 && (
        <EmptyState
          icon={Users}
          titulo="Nenhum inquilino encontrado"
          descricao="Ajuste a busca ou cadastre um novo inquilino para começar."
        />
      )}

      {!isLoading && inquilinos.length > 0 && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquilinos.map((inquilino) => (
                  <TableRow key={inquilino.id}>
                    <TableCell className="font-medium">{inquilino.usuario?.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{inquilino.usuario?.email}</TableCell>
                    <TableCell>{inquilino.cpf}</TableCell>
                    <TableCell>{inquilino.telefone}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={inquilino.excluidoEm ? "excluido" : inquilino.usuario?.ativo ? "ativo" : "inativo"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {inquilino.excluidoEm ? (
                        ehProprietario && (
                          <Button variant="ghost" size="sm" onClick={() => mutRestaurar.mutate(inquilino.id)}>
                            Restaurar
                          </Button>
                        )
                      ) : (
                        <>
                          {podeEditar && (
                            <Button variant="ghost" size="sm" onClick={() => abrirEdicao(inquilino)}>
                              Editar
                            </Button>
                          )}
                          {ehProprietario && (
                            <Button variant="ghost" size="sm" onClick={() => setResetando(inquilino)}>
                              Resetar senha
                            </Button>
                          )}
                          {ehProprietario && inquilino.usuario?.ativo && (
                            <Button variant="ghost" size="sm" onClick={() => setDesativando(inquilino)}>
                              Desativar
                            </Button>
                          )}
                          {ehProprietario && !inquilino.usuario?.ativo && (
                            <Button variant="ghost" size="sm" onClick={() => mutAtivar.mutate(inquilino.id)}>
                              Ativar
                            </Button>
                          )}
                          {ehProprietario && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setExcluindo(inquilino)}
                            >
                              Excluir
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
            {inquilinos.map((inquilino) => (
              <MobileRowCard key={inquilino.id}>
                <MobileRowCardHeader>
                  <div className="min-w-0">
                    <p className="font-medium">{inquilino.usuario?.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{inquilino.usuario?.email}</p>
                  </div>
                  <StatusBadge
                    status={inquilino.excluidoEm ? "excluido" : inquilino.usuario?.ativo ? "ativo" : "inativo"}
                  />
                </MobileRowCardHeader>
                <MobileRowField label="CPF" value={inquilino.cpf} />
                <MobileRowField label="Telefone" value={inquilino.telefone} />
                <MobileRowActions>
                  {inquilino.excluidoEm ? (
                    ehProprietario && (
                      <Button variant="ghost" size="sm" onClick={() => mutRestaurar.mutate(inquilino.id)}>
                        Restaurar
                      </Button>
                    )
                  ) : (
                    <>
                      {podeEditar && (
                        <Button variant="ghost" size="sm" onClick={() => abrirEdicao(inquilino)}>
                          Editar
                        </Button>
                      )}
                      {ehProprietario && (
                        <Button variant="ghost" size="sm" onClick={() => setResetando(inquilino)}>
                          Resetar senha
                        </Button>
                      )}
                      {ehProprietario && inquilino.usuario?.ativo && (
                        <Button variant="ghost" size="sm" onClick={() => setDesativando(inquilino)}>
                          Desativar
                        </Button>
                      )}
                      {ehProprietario && !inquilino.usuario?.ativo && (
                        <Button variant="ghost" size="sm" onClick={() => mutAtivar.mutate(inquilino.id)}>
                          Ativar
                        </Button>
                      )}
                      {ehProprietario && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setExcluindo(inquilino)}
                        >
                          Excluir
                        </Button>
                      )}
                    </>
                  )}
                </MobileRowActions>
              </MobileRowCard>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Inquilino" : "Novo Inquilino"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "Atualize os dados de contato do inquilino."
                : "Um login será criado automaticamente com uma senha temporária."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome completo</Label>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={form.cpf}
                  disabled={Boolean(editando)}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contatoNome">Contato de emergência</Label>
                <Input
                  id="contatoNome"
                  value={form.contatoEmergenciaNome}
                  onChange={(e) => setForm({ ...form, contatoEmergenciaNome: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contatoTelefone">Telefone de emergência</Label>
                <Input
                  id="contatoTelefone"
                  value={form.contatoEmergenciaTelefone}
                  onChange={(e) => setForm({ ...form, contatoEmergenciaTelefone: e.target.value })}
                />
              </div>
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.nome || !form.email}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(credenciais)} onOpenChange={(open) => !open && setCredenciais(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Credenciais de acesso
            </DialogTitle>
            <DialogDescription>
              Repasse estas credenciais temporárias ao inquilino. A senha só é exibida uma vez e deve ser trocada no
              próximo acesso.
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
        titulo="Desativar inquilino"
        descricao={`Isso desativa o login de ${desativando?.usuario?.nome ?? ""}. O histórico de contratos e pagamentos é preservado.`}
        textoConfirmar="Desativar"
        destrutivo
        onConfirm={() => desativando && mutDesativar.mutate(desativando.id)}
      />

      <ConfirmDialog
        open={Boolean(resetando)}
        onOpenChange={(open) => !open && setResetando(null)}
        titulo="Resetar senha"
        descricao={`Isso gera uma nova senha temporária para ${resetando?.usuario?.nome ?? ""}. A senha atual deixará de funcionar e as sessões ativas serão encerradas.`}
        textoConfirmar="Resetar"
        destrutivo
        onConfirm={() => resetando && mutResetarSenha.mutate(resetando.id)}
      />

      <ConfirmDialog
        open={Boolean(excluindo)}
        onOpenChange={(open) => !open && setExcluindo(null)}
        titulo="Excluir inquilino"
        descricao={`O inquilino será ocultado das listagens e o login será desativado, mas o histórico de contratos e pagamentos de ${excluindo?.usuario?.nome ?? ""} é mantido. É possível restaurá-lo depois.`}
        textoConfirmar="Excluir"
        destrutivo
        onConfirm={() => excluindo && mutExcluir.mutate(excluindo.id)}
      />
    </div>
  );
}
