import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPnlColorClass } from "@/lib/colors";
import { formatKrw, formatPct, formatDuration, formatPrice } from "@/lib/format";
import { mockPositions, mockCurrentPrices } from "@/lib/mock";

const NOW_MS = new Date("2026-05-17T14:32:00+09:00").getTime();

export function PositionsCard() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            오픈 포지션
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {mockPositions.length}건
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left pb-2 text-muted-foreground font-medium">종목</th>
              <th className="text-right pb-2 text-muted-foreground font-medium">진입가</th>
              <th className="text-right pb-2 text-muted-foreground font-medium">현재가</th>
              <th className="text-right pb-2 text-muted-foreground font-medium">손익</th>
              <th className="text-right pb-2 text-muted-foreground font-medium">손절가</th>
              <th className="text-right pb-2 text-muted-foreground font-medium">익절가</th>
              <th className="text-right pb-2 text-muted-foreground font-medium">보유시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {mockPositions.map((pos) => {
              const currentPrice = mockCurrentPrices[pos.market];
              const holdMs = NOW_MS - (pos.entryAt ?? NOW_MS);
              return (
                <tr key={pos.id}>
                  <td className="py-2.5">
                    <span className="font-mono font-semibold text-foreground">
                      {pos.market.replace("KRW-", "")}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted-foreground">
                    {pos.entryPrice !== null ? formatPrice(pos.entryPrice) : "-"}
                  </td>
                  <td className="py-2.5 text-right font-mono text-foreground">
                    {currentPrice !== undefined ? formatPrice(currentPrice) : "-"}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className={cn("font-mono font-semibold text-sm", getPnlColorClass(pos.pnlPct ?? 0))}>
                      {formatPct(pos.pnlPct ?? 0)}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground/80">
                      {formatKrw(pos.pnlKrw ?? 0)}
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted-foreground">
                    {pos.stopLossPrice !== null ? formatPrice(pos.stopLossPrice) : "-"}
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted-foreground">
                    {pos.tp1Price !== null ? formatPrice(pos.tp1Price) : "-"}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {formatDuration(holdMs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {mockPositions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            오픈 포지션 없음
          </p>
        )}
      </CardContent>
    </Card>
  );
}
