import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import {
  listarImoveis,
  criarImovel,
  atualizarImovel,
  removerImovel,
  restaurarImovel,
  ativarImovel,
  desativarImovel,
  type ImovelInput,
} from "@/api/imoveis";
import { listarTiposImovel } from "@/api/tiposImovel";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_IMOVEL, type Imovel } from "@/types/domain";
import { formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

const FORM_VAZIO: ImovelInput = {
  tipoImovelId: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  valorAluguelBase: 0,
  descricao: "",
};

export function ImoveisPage() {
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarImoveis;
  const ehProprietario = usuario?.role === "proprietario";
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [apenasExcluidos, setApenasExcluidos] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Imovel | null>(null);
  const [form, setForm] = useState<ImovelInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Imovel | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["imoveis", busca, statusFiltro, apenasExcluidos],
    queryFn: () =>
      listarImoveis({
        busca: busca || undefined,
        status: apenasExcluidos || statusFiltro === "todos" ? undefined : (statusFiltro as Imovel["status"]),
        apenasExcluidos: apenasExcluidos || undefined,
      }),
  });

  const { data: tipos } = useQuery({ queryKey: ["tipos-imovel", true], queryFn: () => listarTiposImovel(true) });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["imoveis"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: ImovelInput) => criarImovel(input),
    onSuccess: async () => {
      toast.success("Imóvel cadastrado.");
      await invalidar();
      setDialogAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ImovelInput }) => atualizarImovel(id, input),
    onSuccess: async () => {
      toast.success("Imóvel atualizado.");
      await invalidar();
      setDialogAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutAtivar = useMutation({
    mutationFn: (id: string) => ativarImovel(id),
    onSuccess: async () => {
      toast.success("Imóvel ativado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutDesativar = useMutation({
    mutationFn: (id: string) => desativarImovel(id),
    onSuccess: async () => {
      toast.success("Imóvel desativado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => removerImovel(id),
    onSuccess: async () => {
      toast.success("Imóvel excluído.");
      await invalidar();
      setExcluindo(null);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setExcluindo(null);
    },
  });

  const mutRestaurar = useMutation({
    mutationFn: (id: string) => restaurarImovel(id),
    onSuccess: async () => {
      toast.success("Imóvel restaurado.");
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

  function abrirEdicao(imovel: Imovel) {
    setEditando(imovel);
    setForm({
      tipoImovelId: imovel.tipoImovelId,
      logradouro: imovel.logradouro,
      numero: imovel.numero,
      complemento: imovel.complemento ?? "",
      bairro: imovel.bairro,
      cidade: imovel.cidade,
      estado: imovel.estado,
      cep: imovel.cep,
      valorAluguelBase: imovel.valorAluguelBase,
      descricao: imovel.descricao ?? "",
    });
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
  const imoveis = resultado?.dados ?? [];

  return (
    <div>
      <PageHeader
        titulo="Imóveis"
        descricao="Cadastro e acompanhamento dos imóveis disponíveis para aluguel."
        acoes={
          podeEditar ? (
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Novo Imóvel
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por endereço, bairro ou cidade..."
            className="pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={statusFiltro} onValueChange={setStatusFiltro} disabled={apenasExcluidos}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_IMOVEL.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "vago" ? "Vago" : s === "alugado" ? "Alugado" : s === "manutencao" ? "Manutenção" : "Inativo"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {ehProprietario && (
          <label className="flex items-center gap-2 whitespace-nowrap px-1 text-sm">
            <Checkbox checked={apenasExcluidos} onCheckedChange={(v) => setApenasExcluidos(v === true)} />
            Mostrar excluídos
          </label>
        )}
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endereço</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor base</TableHead>
              <TableHead>Status</TableHead>
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
            {!isLoading && imoveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum imóvel encontrado.
                </TableCell>
              </TableRow>
            )}
            {imoveis.map((imovel) => (
              <TableRow key={imovel.id}>
                <TableCell>
                  <Link to={`/imoveis/${imovel.id}`} className="font-medium hover:underline">
                    {imovel.logradouro}, {imovel.numero}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {imovel.bairro}, {imovel.cidade} - {imovel.estado}
                  </p>
                </TableCell>
                <TableCell>{imovel.tipoImovel?.nome ?? "-"}</TableCell>
                <TableCell>{formatarMoeda(imovel.valorAluguelBase)}</TableCell>
                <TableCell>
                  <StatusBadge status={imovel.excluidoEm ? "excluido" : imovel.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/imoveis/${imovel.id}`}>Ver detalhes</Link>
                  </Button>
                  {imovel.excluidoEm ? (
                    ehProprietario && (
                      <Button variant="ghost" size="sm" onClick={() => mutRestaurar.mutate(imovel.id)}>
                        Restaurar
                      </Button>
                    )
                  ) : (
                    <>
                      {podeEditar && (
                        <Button variant="ghost" size="sm" onClick={() => abrirEdicao(imovel)}>
                          Editar
                        </Button>
                      )}
                      {podeEditar && imovel.status === "inativo" && (
                        <Button variant="ghost" size="sm" onClick={() => mutAtivar.mutate(imovel.id)}>
                          Ativar
                        </Button>
                      )}
                      {podeEditar && imovel.status !== "inativo" && imovel.status !== "alugado" && (
                        <Button variant="ghost" size="sm" onClick={() => mutDesativar.mutate(imovel.id)}>
                          Desativar
                        </Button>
                      )}
                      {ehProprietario && imovel.status !== "alugado" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setExcluindo(imovel)}
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
            <DialogDescription>Preencha os dados do imóvel.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Tipo de imóvel</Label>
              <Select value={form.tipoImovelId} onValueChange={(v) => setForm({ ...form, tipoImovelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos?.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={form.logradouro}
                  onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="estado">UF</Label>
                <Input
                  id="estado"
                  maxLength={2}
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="valor">Valor do aluguel base</Label>
                <CurrencyInput
                  id="valor"
                  value={form.valorAluguelBase}
                  onValueChange={(v) => setForm({ ...form, valorAluguelBase: v ?? 0 })}
                />
              </div>
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
            <Button onClick={salvar} disabled={salvando || !form.tipoImovelId || !form.logradouro}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(excluindo)}
        onOpenChange={(open) => !open && setExcluindo(null)}
        titulo="Excluir imóvel"
        descricao="O imóvel será ocultado das listagens, mas o histórico de contratos e pagamentos é mantido. É possível restaurá-lo depois."
        textoConfirmar="Excluir"
        destrutivo
        onConfirm={() => {
          if (excluindo) mutExcluir.mutate(excluindo.id);
        }}
      />
    </div>
  );
}
