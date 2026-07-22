import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-2xl font-semibold",
            tone === "success" && "text-[color:var(--status-good)]",
            tone === "critical" && "text-destructive",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
