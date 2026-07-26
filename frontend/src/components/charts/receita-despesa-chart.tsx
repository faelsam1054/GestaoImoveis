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
    <div className="animate-in zoom-in-95 fade-in-0 rounded-md border bg-popover p-3 text-sm shadow-md duration-150">
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
        <defs>
          {/* Brilho sutil que percorre a linha (offset do stop do meio anima
              de um lado a outro) - continua usando as mesmas cores do tema. */}
          <linearGradient id="gradienteReceita" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="45%" style={{ stopColor: "color-mix(in oklch, var(--chart-1), white 45%)" }}>
              <animate attributeName="offset" values="-0.4;1.4" dur="5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="var(--chart-1)" />
          </linearGradient>
          <linearGradient id="gradienteDespesa" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--chart-2)" />
            <stop offset="45%" style={{ stopColor: "color-mix(in oklch, var(--chart-2), white 45%)" }}>
              <animate attributeName="offset" values="-0.4;1.4" dur="5s" repeatCount="indefinite" begin="0.4s" />
            </stop>
            <stop offset="100%" stopColor="var(--chart-2)" />
          </linearGradient>
        </defs>
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
          stroke="url(#gradienteReceita)"
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          animationDuration={1000}
          animationEasing="ease-out"
        />
        <Line
          type="monotone"
          dataKey="despesa"
          name="Despesa"
          stroke="url(#gradienteDespesa)"
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
