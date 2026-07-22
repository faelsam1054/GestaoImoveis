import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import {
  listarTiposImovel,
  criarTipoImovel,
  atualizarTipoImovel,
  desativarTipoImovel,
  reativarTipoImovel,
  type TipoImovelInput,
} from "@/api/tiposImovel";
import type { TipoImovel } from "@/types/domain";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FORM_VAZIO: TipoImovelInput = { nome: "", descricao: "" };

export function TiposImovelPage() {
  const queryClient = useQueryClient();
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<TipoImovel | null>(null);
  const [form, setForm] = useState<TipoImovelInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const { data: tipos, isLoading } = useQuery({
    queryKey: ["tipos-imovel", mostrarInativos],
    queryFn: () => listarTiposImovel(mostrarInativos ? undefined : true),
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["tipos-imovel"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: TipoImovelInput) => criarTipoImovel(input),
    onSuccess: async () => {
      toast.success("Tipo de imóvel criado.");
      await invalidar();
      setDialogAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TipoImovelInput }) => atualizarTipoImovel(id, input),
    onSuccess: async () => {
      toast.success("Tipo de imóvel atualizado.");
      await invalidar();
      setDialogAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutToggleAtivo = useMutation({
    mutationFn: (tipo: TipoImovel) => (tipo.ativo ? desativarTipoImovel(tipo.id) : reativarTipoImovel(tipo.id)),
    onSuccess: async () => {
      toast.success("Status atualizado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(tipo: TipoImovel) {
    setEditando(tipo);
    setForm({ nome: tipo.nome, descricao: tipo.descricao ?? "" });
    setErro(null);
    setDialogAberto(true);
  }

  function salvar() {
    setErro(null);
    if (editando) {
      mutAtualizar.mutate({ id: editando.id, input: form });
    } else {
      mutCriar.mutate(form);
    }
  }

  const salvando = mutCriar.isPending || mutAtualizar.isPending;

  return (
    <div>
      <PageHeader
        titulo="Tipos de Imóvel"
        descricao="Categorias usadas ao cadastrar imóveis (ex: Casa, Apartamento, Kitnet)."
        acoes={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo Tipo
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Switch id="mostrar-inativos" checked={mostrarInativos} onCheckedChange={setMostrarInativos} />
        <Label htmlFor="mostrar-inativos">Mostrar tipos desativados</Label>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
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
            {!isLoading && tipos?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum tipo de imóvel cadastrado.
                </TableCell>
              </TableRow>
            )}
            {tipos?.map((tipo) => (
              <TableRow key={tipo.id}>
                <TableCell className="font-medium">{tipo.nome}</TableCell>
                <TableCell className="text-muted-foreground">{tipo.descricao || "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={tipo.ativo ? "ativo" : "inativo"} />
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(tipo)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => mutToggleAtivo.mutate(tipo)}
                    disabled={mutToggleAtivo.isPending}
                  >
                    {tipo.ativo ? "Desativar" : "Reativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Tipo de Imóvel" : "Novo Tipo de Imóvel"}</DialogTitle>
            <DialogDescription>
              {editando ? "Atualize os dados do tipo de imóvel." : "Cadastre uma nova categoria de imóvel."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.nome}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
