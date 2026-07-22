import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Paperclip } from "lucide-react";
import {
  listarManutencao,
  criarManutencao,
  atualizarStatusManutencao,
  anexarComprovanteManutencao,
  type GastoManutencaoInput,
} from "@/api/manutencao";
import { listarImoveis } from "@/api/imoveis";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIA_MANUTENCAO, STATUS_MANUTENCAO, type GastoManutencao } from "@/types/domain";
import { formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FORM_VAZIO: GastoManutencaoInput = {
  imovelId: "",
  descricao: "",
  categoria: "outros",
  valor: 0,
  prestadorNome: "",
  prestadorDocumento: "",
  prestadorTelefone: "",
  observacoes: "",
};

export function ManutencaoPage() {
  const { usuario } = useAuth();
  const podeCadastrar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeCadastrarManutencao;
  const queryClient = useQueryClient();
  const inputComprovanteRef = useRef<HTMLInputElement>(null);
  const [anexandoId, setAnexandoId] = useState<string | null>(null);

  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<GastoManutencaoInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["manutencao", statusFiltro],
    queryFn: () =>
      listarManutencao({ status: statusFiltro === "todos" ? undefined : (statusFiltro as GastoManutencao["status"]) }),
  });

  const { data: imoveisResultado } = useQuery({
    queryKey: ["imoveis", "todos-para-manutencao"],
    queryFn: () => listarImoveis({}),
    enabled: dialogAberto,
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["manutencao"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: GastoManutencaoInput) => criarManutencao(input),
    onSuccess: async () => {
      toast.success("Gasto de manutenção cadastrado.");
      await invalidar();
      setDialogAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GastoManutencao["status"] }) =>
      atualizarStatusManutencao(id, status),
    onSuccess: async () => {
      toast.success("Status atualizado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutComprovante = useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) => anexarComprovanteManutencao(id, arquivo),
    onSuccess: async () => {
      toast.success("Comprovante anexado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  function proximoStatus(atual: GastoManutencao["status"]): GastoManutencao["status"] | null {
    const ordem = STATUS_MANUTENCAO;
    const idx = ordem.indexOf(atual);
    return idx < ordem.length - 1 ? ordem[idx + 1] : null;
  }

  const gastos = resultado?.dados ?? [];

  return (
    <div>
      <PageHeader
        titulo="Manutenção"
        descricao="Orçamentos e execuções de manutenção nos imóveis."
        acoes={
          podeCadastrar ? (
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Novo Gasto
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 max-w-xs">
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_MANUTENCAO.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input
        ref={inputComprovanteRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo && anexandoId) mutComprovante.mutate({ id: anexandoId, arquivo });
          e.target.value = "";
          setAnexandoId(null);
        }}
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imóvel</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && gastos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum gasto de manutenção encontrado.
                </TableCell>
              </TableRow>
            )}
            {gastos.map((gasto) => {
              const proximo = proximoStatus(gasto.status);
              return (
                <TableRow key={gasto.id}>
                  <TableCell>
                    {gasto.imovel?.logradouro}, {gasto.imovel?.numero}
                  </TableCell>
                  <TableCell>{gasto.descricao}</TableCell>
                  <TableCell className="capitalize">{gasto.categoria}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {gasto.origem === "chamado_inquilino" ? "Chamado do inquilino" : "Proprietário"}
                  </TableCell>
                  <TableCell>{formatarMoeda(gasto.valor)}</TableCell>
                  <TableCell>
                    <StatusBadge status={gasto.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {podeCadastrar && proximo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mutStatus.mutate({ id: gasto.id, status: proximo })}
                        disabled={mutStatus.isPending}
                      >
                        Marcar {proximo}
                      </Button>
                    )}
                    {podeCadastrar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAnexandoId(gasto.id);
                          inputComprovanteRef.current?.click();
                        }}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Gasto de Manutenção</DialogTitle>
            <DialogDescription>Registre um orçamento de manutenção para um imóvel.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Imóvel</Label>
              <Select value={form.imovelId} onValueChange={(v) => setForm({ ...form, imovelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {imoveisResultado?.dados.map((imovel) => (
                    <SelectItem key={imovel.id} value={imovel.id}>
                      {imovel.logradouro}, {imovel.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Categoria</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm({ ...form, categoria: v as GastoManutencaoInput["categoria"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIA_MANUTENCAO.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="valor">Valor</Label>
                <Input
                  id="valor"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="prestadorNome">Prestador de serviço</Label>
                <Input
                  id="prestadorNome"
                  value={form.prestadorNome}
                  onChange={(e) => setForm({ ...form, prestadorNome: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="prestadorTelefone">Telefone do prestador</Label>
                <Input
                  id="prestadorTelefone"
                  value={form.prestadorTelefone}
                  onChange={(e) => setForm({ ...form, prestadorTelefone: e.target.value })}
                />
              </div>
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
              disabled={mutCriar.isPending || !form.imovelId || !form.descricao}
            >
              {mutCriar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
