"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  AreaSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateEquityCurve } from "@/lib/mock";

type TabValue = "1d" | "7d" | "30d" | "all";

const EQUITY_CURVE = generateEquityCurve();

function equityNetChangeSign(): 1 | -1 | 0 {
  if (EQUITY_CURVE.length < 2) return 0;
  const first = EQUITY_CURVE[0]!.value;
  const last = EQUITY_CURVE[EQUITY_CURVE.length - 1]!.value;
  if (last > first) return 1;
  if (last < first) return -1;
  return 0;
}

const NET_CHANGE_SIGN = equityNetChangeSign();

function getPlaceholderSeries(points: number) {
  const now = Math.floor(Date.now() / 1000);
  const interval = 1800;
  return Array.from({ length: points }, (_, i) => ({
    time: (now - (points - i) * interval) as UTCTimestamp,
    value: 1_000_000,
  }));
}

function getChartColors(theme: string | undefined, netChangeSign: 1 | -1 | 0) {
  const isDark = theme === "dark";

  let line: string;
  let topFillRgb: string;
  if (netChangeSign > 0) {
    // Korean up = red
    line = isDark ? "#f05252" : "#e64545";
    topFillRgb = isDark ? "rgba(240,82,82,0.22)" : "rgba(230,69,69,0.15)";
  } else if (netChangeSign < 0) {
    // Korean down = blue
    line = isDark ? "#3b82f6" : "#2563eb";
    topFillRgb = isDark ? "rgba(59,130,246,0.22)" : "rgba(37,99,235,0.15)";
  } else {
    // flat = muted
    line = isDark ? "#a1a1aa" : "#71717a";
    topFillRgb = isDark ? "rgba(161,161,170,0.20)" : "rgba(113,113,122,0.12)";
  }

  return {
    background: isDark ? "#09090b" : "#ffffff",
    text: isDark ? "#a1a1aa" : "#71717a",
    grid: isDark ? "#27272a" : "#f4f4f5",
    line,
    topFill: topFillRgb,
    bottomFill: isDark ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)",
  };
}

interface EquityChartProps {
  tab?: TabValue;
}

export function EquityChart({ tab: externalTab }: EquityChartProps) {
  const [tab, setTab] = useState<TabValue>(externalTab ?? "7d");
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const buildChart = useCallback(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const colors = getChartColors(resolvedTheme, NET_CHANGE_SIGN);
    const container = containerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontSize: 11,
        fontFamily: "var(--font-geist-mono, monospace)",
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: {
        borderColor: colors.grid,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: colors.grid,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    // lightweight-charts v5: addSeries(SeriesDefinition, options)
    const series = chart.addSeries(AreaSeries, {
      lineColor: colors.line,
      topColor: colors.topFill,
      bottomColor: colors.bottomFill,
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) =>
          `₩${new Intl.NumberFormat("ko-KR").format(Math.round(price))}`,
        minMove: 1000,
      },
    });

    if (tab === "7d") {
      series.setData(
        EQUITY_CURVE.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
      );
    } else {
      const count = tab === "1d" ? 48 : tab === "30d" ? 1440 : 2000;
      series.setData(getPlaceholderSeries(count));
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(container);

    chartRef.current = chart;
    seriesRef.current = series;

    return () => ro.disconnect();
  }, [resolvedTheme, tab]);

  useEffect(() => {
    const cleanup = buildChart();
    return () => {
      cleanup?.();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [buildChart]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            자산 곡선
          </CardTitle>
          <Tabs value={tab} onValueChange={(v: string) => setTab(v as TabValue)}>
            <TabsList className="h-7">
              <TabsTrigger value="1d" className="text-xs px-2 h-6">1일</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs px-2 h-6">7일</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2 h-6">30일</TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-2 h-6">전체</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {tab !== "7d" && (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            데이터 준비 중 (Phase 2)
          </div>
        )}
        <div
          ref={containerRef}
          className={tab === "7d" ? "h-[220px] w-full" : "hidden"}
        />
      </CardContent>
    </Card>
  );
}
