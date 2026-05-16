import { KpiCard } from "@/components/home/kpi-card";
import { EquityChart } from "@/components/home/equity-chart";
import { PositionsCard } from "@/components/home/positions-card";
import { SignalsFeed } from "@/components/home/signals-feed";
import { mockKpi } from "@/lib/mock";
import { formatKrw } from "@/lib/format";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Page heading */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">홈</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          실시간 봇 현황 — PAPER 모드
        </p>
      </div>

      {/* KPI row — 총 자산 first */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="총 자산"
          value={formatKrw(mockKpi.totalEquityKrw)}
          delta={mockKpi.totalEquityChangeFromStartPct}
          helperText={`시작 ${formatKrw(mockKpi.startingCapitalKrw)} 대비`}
          prominent
        />
        <KpiCard
          label="오늘 손익"
          value={formatKrw(mockKpi.todayPnlKrw)}
          delta={mockKpi.todayPnlPct}
          helperText={`당일 시작 ${formatKrw(mockKpi.todayStartCapitalKrw)} 대비`}
        />
        <KpiCard
          label="7일 손익"
          value={formatKrw(mockKpi.week7PnlKrw)}
          delta={mockKpi.week7PnlPct}
          helperText={`7일 전 ${formatKrw(mockKpi.week7StartCapitalKrw)} 대비`}
        />
        <KpiCard
          label="승률"
          value={`${mockKpi.winRate}%`}
          helperText={`${mockKpi.winCount}승 ${mockKpi.lossCount}패 / 오늘 ${mockKpi.totalTrades}건`}
        />
      </div>

      {/* Equity chart — full width */}
      <EquityChart />

      {/* Positions + Signals side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PositionsCard />
        </div>
        <div>
          <SignalsFeed />
        </div>
      </div>
    </div>
  );
}
