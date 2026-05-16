import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTimeKst, formatPrice } from "@/lib/format";
import {
  mockSignals,
  SIGNAL_DECISION_LABELS,
  SIGNAL_DECISION_VARIANTS,
} from "@/lib/mock";

const variantClasses: Record<string, string> = {
  entered: "bg-price-up/10 text-price-up border border-price-up/30",
  warn: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  neutral: "bg-muted text-muted-foreground border border-border",
};

export function SignalsFeed() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">
          최근 시그널
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col gap-2">
          {mockSignals.map((signal) => {
            const variant =
              SIGNAL_DECISION_VARIANTS[signal.decision] ?? "neutral";
            const badgeClass = variantClasses[variant] ?? variantClasses.neutral;
            const label =
              SIGNAL_DECISION_LABELS[signal.decision] ?? signal.decision;

            return (
              <div
                key={signal.id}
                className="flex items-start gap-3 rounded-md py-1.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {signal.market.replace("KRW-", "")}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatPrice(signal.triggerPrice)}
                    </span>
                  </div>
                  {signal.featuresHuman && (
                    <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">
                      {signal.featuresHuman}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatTimeKst(signal.detectedAt)}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "font-mono text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded mt-0.5",
                    badgeClass
                  )}
                >
                  {label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
