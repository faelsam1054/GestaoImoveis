import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, KeyRound, ShieldCheck } from "lucide-react";
import {
  listarAdministradores,
  criarAdministrador,
  desativarAdministrador,
  atualizarPermissoesAdministrador,
  type AdministradorInput,
} from "@/api/administradores";
import type { CredenciaisTemporarias } from "@/api/inquilinos";
import { useAuth } from "@/contexts/AuthContext";
import type { Administrador, PermissaoAdministrador } from "@/types/domain";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

const FORM_VAZIO: AdministradorInput = { nome: "", email: "" };

const PERMISSOES_LABELS: { chave: keyof PermissaoAdministrador; label: string }[] = [
  { chave: "podeVerImoveis", label: "Ver lista de imóveis" },
  { chave: "podeEditarImoveis", label: "Cadastrar/editar imóveis" },
  { chave: "podeVerInquilinos", label: "Ver lista de inquilinos" },
  { chave: "podeEditarInquilinos", label: "Cadastrar/editar inquilinos" },
  { chave: "podeVerContratos", label: "Ver contratos" },
  { chave: "podeEditarContratos", label: "Cadastrar/editar contratos" },
  { chave: "podeVerPagamentos", label: "Ver pagamentos" },
  { chave: "podeRegistrarPagamentos", label: "Registrar pagamentos" },
  { chave: "podeVerManutencao", label: "Ver gastos com manutenção" },
  { chave: "podeCadastrarManutencao", label: "Cadastrar gastos com manutenção" },
  { chave: "podeVerAdministradores", label: "Ver lista de administradores" },
  { chave: "podeEditarPerfil", label: "Editar o próprio perfil" },
];

export function AdministradoresPage() {
  const { usuario } = useAuth();
  const ehProprietario = usuario?.role === "proprietario";
  const queryClient = useQueryClient();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<AdministradorInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<CredenciaisTemporarias | null>(null);
  const [desativando, setDesativando] = useState<Administrador | null>(null);
  const [editandoPermissoes, setEditandoPermissoes] = useState<Administrador | null>(null);
  const [permissoesForm, setPermissoesForm] = useState<PermissaoAdministrador | null>(null);

  const { data: administradores, isLoading } = useQuery({
    queryKey: ["administradores"],
    queryFn: listarAdministradores,
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["administradores"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: AdministradorInput) => criarAdministrador(input),
    onSuccess: async (resposta) => {
      await invalidar();
      setDialogAberto(false);
      setCredenciais(resposta.credenciaisTemporarias);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutDesativar = useMutation({
    mutationFn: (id: string) => desativarAdministrador(id),
    onSuccess: async () => {
      toast.success("Administrador desativado.");
      await invalidar();
      setDesativando(null);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutPermissoes = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PermissaoAdministrador> }) =>
      atualizarPermissoesAdministrador(id, input),
    onSuccess: async () => {
      toast.success("Permissões atualizadas.");
      await invalidar();
      setEditandoPermissoes(null);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirPermissoes(administrador: Administrador) {
    setEditandoPermissoes(administrador);
    setPermissoesForm(
      administrador.permissaoAdministrador ?? {
        podeVerImoveis: false,
        podeEditarImoveis: false,
        podeVerInquilinos: false,
        podeEditarInquilinos: false,
        podeVerContratos: false,
        podeEditarContratos: false,
        podeVerPagamentos: false,
        podeRegistrarPagamentos: false,
        podeVerManutencao: false,
        podeCadastrarManutencao: false,
        podeVerAdministradores: false,
        podeEditarPerfil: true,
      },
    );
  }

  return (
    <div>
      <PageHeader
        titulo="Administradores"
        descricao="Contas com acesso ao sistema para ajudar na gestão do dia a dia."
        acoes={
          ehProprietario ? (
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Novo Administrador
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
            {!isLoading && administradores?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum administrador cadastrado.
                </TableCell>
              </TableRow>
            )}
            {administradores?.map((administrador) => (
              <TableRow key={administrador.id}>
                <TableCell className="font-medium">{administrador.nome}</TableCell>
                <TableCell className="text-muted-foreground">{administrador.email}</TableCell>
                <TableCell>
                  <StatusBadge status={administrador.ativo ? "ativo" : "inativo"} />
                </TableCell>
                <TableCell className="text-right">
                  {ehProprietario && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => abrirPermissoes(administrador)}>
                        <ShieldCheck className="h-4 w-4" />
                        Permissões
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/pagamentos-admin?administradorId=${administrador.id}`}>Mensalidades</Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDesativando(administrador)}>
                        Desativar
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Novo administrador */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Administrador</DialogTitle>
            <DialogDescription>
              Um login será criado com senha temporária e todas as permissões desativadas por padrão.
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
              Administrador cadastrado
            </DialogTitle>
            <DialogDescription>
              Repasse estas credenciais temporárias. A senha só é exibida uma vez.
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

      {/* Permissoes */}
      <Dialog open={Boolean(editandoPermissoes)} onOpenChange={(open) => !open && setEditandoPermissoes(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissões de {editandoPermissoes?.nome}</DialogTitle>
            <DialogDescription>Defina quais módulos este administrador pode acessar.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {permissoesForm &&
              PERMISSOES_LABELS.map(({ chave, label }) => (
                <label key={chave} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={permissoesForm[chave]}
                    onCheckedChange={(marcado) =>
                      setPermissoesForm({ ...permissoesForm, [chave]: Boolean(marcado) })
                    }
                  />
                  {label}
                </label>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoPermissoes(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editandoPermissoes &&
                permissoesForm &&
                mutPermissoes.mutate({ id: editandoPermissoes.id, input: permissoesForm })
              }
              disabled={mutPermissoes.isPending}
            >
              {mutPermissoes.isPending ? "Salvando..." : "Salvar permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(desativando)}
        onOpenChange={(open) => !open && setDesativando(null)}
        titulo="Desativar administrador"
        descricao={`Isso desativa o login de ${desativando?.nome ?? ""}. Ele não conseguirá mais acessar o sistema.`}
        textoConfirmar="Desativar"
        destrutivo
        onConfirm={() => desativando && mutDesativar.mutate(desativando.id)}
      />
    </div>
  );
}
