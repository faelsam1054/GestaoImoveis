import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, KeyRound } from "lucide-react";
import {
  listarInquilinos,
  criarInquilino,
  atualizarInquilino,
  desativarInquilino,
  type InquilinoInput,
  type CredenciaisTemporarias,
} from "@/api/inquilinos";
import { useAuth } from "@/contexts/AuthContext";
import type { Inquilino } from "@/types/domain";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Inquilino | null>(null);
  const [form, setForm] = useState<InquilinoInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<CredenciaisTemporarias | null>(null);
  const [desativando, setDesativando] = useState<Inquilino | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["inquilinos", busca],
    queryFn: () => listarInquilinos(busca || undefined),
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

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou CPF..."
          className="pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && inquilinos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum inquilino encontrado.
                </TableCell>
              </TableRow>
            )}
            {inquilinos.map((inquilino) => (
              <TableRow key={inquilino.id}>
                <TableCell className="font-medium">{inquilino.usuario?.nome}</TableCell>
                <TableCell className="text-muted-foreground">{inquilino.usuario?.email}</TableCell>
                <TableCell>{inquilino.cpf}</TableCell>
                <TableCell>{inquilino.telefone}</TableCell>
                <TableCell className="text-right">
                  {podeEditar && (
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(inquilino)}>
                      Editar
                    </Button>
                  )}
                  {ehProprietario && (
                    <Button variant="ghost" size="sm" onClick={() => setDesativando(inquilino)}>
                      Desativar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
              Inquilino cadastrado
            </DialogTitle>
            <DialogDescription>
              Repasse estas credenciais temporárias ao inquilino. A senha só é exibida uma vez e deve ser trocada no
              primeiro acesso.
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
    </div>
  );
}
