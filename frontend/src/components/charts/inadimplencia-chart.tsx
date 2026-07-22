import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarCompetencia, formatarMoeda } from "@/lib/format";
import type { LinhaInadimplencia } from "@/api/relatorios";

function TooltipPersonalizado({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: LinhaInadimplencia }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const linha = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover p-3 text-sm shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{formatarCompetencia(String(label))}</p>
      <p className="text-muted-foreground">
        {linha.quantidade} pagamento(s) - {formatarMoeda(linha.valor)}
      </p>
    </div>
  );
}

// Serie unica: usa o hue sequencial padrao (chart-1), sem necessidade de legenda.
export function InadimplenciaChart({ dados }: { dados: LinhaInadimplencia[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="mes"
          tickFormatter={(v: string) => formatarCompetencia(v)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="valor" name="Em atraso" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
