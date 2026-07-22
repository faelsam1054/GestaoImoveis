import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarCompetencia } from "@/lib/format";
import type { PontoGraficoFinanceiro } from "@/api/dashboard";

function formatarEixoValor(valor: number): string {
  if (valor >= 1000) return `${(valor / 1000).toFixed(valor % 1000 === 0 ? 0 : 1)}k`;
  return String(valor);
}

function TooltipPersonalizado({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover p-3 text-sm shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{formatarCompetencia(String(label))}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.name}: {item.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      ))}
    </div>
  );
}

export function ReceitaDespesaChart({ dados }: { dados: PontoGraficoFinanceiro[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="mes"
          tickFormatter={(v: string) => formatarCompetencia(v)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatarEixoValor}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<TooltipPersonalizado />} />
        <Legend wrapperStyle={{ fontSize: 13, color: "var(--muted-foreground)" }} />
        <Line
          type="monotone"
          dataKey="receita"
          name="Receita"
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
        />
        <Line
          type="monotone"
          dataKey="despesa"
          name="Despesa"
          stroke="var(--chart-2)"
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
