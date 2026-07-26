import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Preset {
  label: string;
  range: () => DateRange;
}

const PRESETS: Preset[] = [
  { label: "Este mês", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  {
    label: "Mês passado",
    range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }),
  },
  { label: "Últimos 30 dias", range: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Últimos 90 dias", range: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "Este ano", range: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

interface DateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [aberto, setAberto] = useState(false);

  const rotulo = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${format(value.from, "dd/MM/yyyy")} - ${format(value.to, "dd/MM/yyyy")}`
      : format(value.from, "dd/MM/yyyy")
    : "Todos os períodos";

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn(value?.from && "border-primary/50 text-foreground", className)}>
          <CalendarIcon className="h-4 w-4" />
          {rotulo}
          {value?.from && (
            <span
              role="button"
              tabIndex={0}
              className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-1 border-b p-2 sm:border-b-0 sm:border-r">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start font-normal"
                onClick={() => {
                  onChange(preset.range());
                  setAberto(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            defaultMonth={value?.from}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
