import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_ICON_BG: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  critical: "bg-destructive/10 text-destructive",
};

const TONE_VALUE: Record<string, string> = {
  default: "text-foreground",
  success: "text-success",
  critical: "text-destructive",
};

export function StatTile({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "critical";
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4">
        {icon && (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONE_ICON_BG[tone])}>
            {icon}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn("text-2xl leading-tight font-semibold tracking-tight text-balance", TONE_VALUE[tone])}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
