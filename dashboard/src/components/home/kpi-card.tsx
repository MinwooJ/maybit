import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPnlColorClass } from "@/lib/colors";
import { formatPctChange } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number | null;
  helperText?: string;
  className?: string;
  /** Visually anchors this card as the primary metric (larger value, subtle border accent). */
  prominent?: boolean;
}

export function KpiCard({
  label,
  value,
  delta,
  helperText,
  className,
  prominent = false,
}: KpiCardProps) {
  const hasDelta = delta !== null && delta !== undefined;

  return (
    <Card
      className={cn(
        "bg-card border-border",
        prominent && "border-foreground/20 ring-1 ring-foreground/10",
        className
      )}
    >
      <CardContent className="p-4 flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p
          className={cn(
            "font-mono font-semibold text-foreground leading-tight",
            prominent ? "text-2xl" : "text-xl"
          )}
        >
          {value}
        </p>
        {hasDelta && (
          <p
            className={cn(
              "text-xs font-mono font-medium",
              getPnlColorClass(delta)
            )}
          >
            {formatPctChange(delta)}
          </p>
        )}
        {helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </CardContent>
    </Card>
  );
}
