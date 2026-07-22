import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORIA_MANUTENCAO } from "@/types/domain";
import { formatarMoeda } from "@/lib/format";
import type { LinhaManutencaoCategoria } from "@/api/relatorios";

// Cor por categoria e fixa pela ordem canonica do dominio (nunca pela ordem/valor
// dos dados) -- assim a cor de "eletrica" nao muda so porque outro mes mudou o ranking.
const CORES_POR_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIA_MANUTENCAO.map((categoria, i) => [categoria, `var(--chart-${i + 1})`]),
);

function TooltipPersonalizado({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: LinhaManutencaoCategoria }[];
}) {
  if (!active || !payload?.length) return null;
  const linha = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover p-3 text-sm shadow-md capitalize">
      <p className="mb-1 font-medium text-popover-foreground">{linha.categoria}</p>
      <p className="text-muted-foreground">
        {linha.quantidade} gasto(s) - {formatarMoeda(linha.valor)}
      </p>
    </div>
  );
}

export function ManutencaoCategoriaChart({ dados }: { dados: LinhaManutencaoCategoria[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, dados.length * 40)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="categoria"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={90}
          className="capitalize"
        />
        <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {dados.map((linha) => (
            <Cell key={linha.categoria} fill={CORES_POR_CATEGORIA[linha.categoria]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
