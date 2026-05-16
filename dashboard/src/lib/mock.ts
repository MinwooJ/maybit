/**
 * Deterministic mock data generators for the maybit dashboard preview.
 * All data is seeded so the dashboard looks identical on every refresh.
 */

import type { BotPosition, Signal, Trade, DailyStats } from '@maybit/shared';

// Simple seeded LCG PRNG for determinism
function makePrng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const rng = makePrng(20260517);

function uuid(index: number): string {
  const hex = (index * 2654435761 + 0xdeadbeef).toString(16).padStart(8, '0');
  return `${hex}-0000-4000-8000-000000000000`;
}

// ── KST-based time helpers ────────────────────────────────────────────────────

const NOW = new Date('2026-05-17T14:32:00+09:00').getTime();
const DAY = 86400_000;
const HOUR = 3600_000;
const MIN = 60_000;

// ── Mock BTC price ────────────────────────────────────────────────────────────

export const mockBtcPrice = {
  price: 116_479_000,
  change24hPct: -1.1,
};

// ── Mock config/mode ──────────────────────────────────────────────────────────

export const mockConfig = {
  mode: 'paper' as const,
  killSwitch: false,
  botCapitalKrw: 1_000_000,
  maxPositionKrw: 500_000,
};

// ── Bot liveness status ───────────────────────────────────────────────────────

export type BotStatusState = 'active' | 'degraded' | 'stopped';

export const mockBotStatus: {
  state: BotStatusState;
  lastTickMs: number;
  uptimeMs: number;
} = {
  state: 'active',
  lastTickMs: 300,     // 0.3s ago
  uptimeMs: 4 * 60 * 60 * 1000 + 32 * 60 * 1000, // 4h 32m
};

// ── KPI data ──────────────────────────────────────────────────────────────────

export const mockKpi = {
  startingCapitalKrw: 1_000_000,
  totalEquityKrw: 1_012_300,
  totalEquityChangeFromStartPct: 1.23,
  availableCapital: 620_400,
  todayPnlKrw: 12_850,
  todayPnlPct: 1.285,
  todayStartCapitalKrw: 999_450,
  week7PnlKrw: 38_200,
  week7PnlPct: 3.82,
  week7StartCapitalKrw: 974_100,
  winCount: 5,
  lossCount: 3,
  totalTrades: 8,
  winRate: 62.5,
};

// ── Equity curve (7 days, 30-min candles) ────────────────────────────────────

export interface EquityPoint {
  time: number; // unix seconds (KST)
  value: number;
}

export function generateEquityCurve(): EquityPoint[] {
  const points: EquityPoint[] = [];
  const startTime = NOW - 7 * DAY;
  const intervalMs = 30 * MIN;
  let equity = 975_000;

  const r = makePrng(42);

  for (let t = startTime; t <= NOW; t += intervalMs) {
    const noise = (r() - 0.48) * 4_000;
    equity = Math.max(940_000, equity + noise);
    points.push({ time: Math.floor(t / 1000), value: Math.round(equity) });
  }

  // Force the last point to reflect current equity
  if (points.length > 0) {
    points[points.length - 1]!.value = mockKpi.totalEquityKrw;
  }

  return points;
}

// ── Open positions ────────────────────────────────────────────────────────────

export const mockPositions: BotPosition[] = [
  {
    id: uuid(1),
    market: 'KRW-XRP',
    status: 'open',
    entrySignalId: uuid(10),
    entryOrderId: 'order-xrp-001',
    entryPrice: 820,
    entryQty: 380,
    entryKrw: 311_600,
    entryAt: NOW - 2 * HOUR - 18 * MIN,
    stopLossPrice: 800,
    tp1Price: 862,
    tp1Filled: false,
    trailingPrice: null,
    exitOrderId: null,
    exitPrice: null,
    exitQty: null,
    exitKrw: null,
    exitAt: null,
    exitReason: null,
    pnlKrw: 8_740,
    pnlPct: 2.8,
    feesKrw: 311,
  },
  {
    id: uuid(2),
    market: 'KRW-DOGE',
    status: 'open',
    entrySignalId: uuid(11),
    entryOrderId: 'order-doge-001',
    entryPrice: 182,
    entryQty: 1640,
    entryKrw: 298_480,
    entryAt: NOW - 47 * MIN,
    stopLossPrice: 176,
    tp1Price: 196,
    tp1Filled: false,
    trailingPrice: null,
    exitOrderId: null,
    exitPrice: null,
    exitQty: null,
    exitKrw: null,
    exitAt: null,
    exitReason: null,
    pnlKrw: -1_820,
    pnlPct: -0.61,
    feesKrw: 298,
  },
];

export const mockCurrentPrices: Record<string, number> = {
  'KRW-XRP': 843,
  'KRW-DOGE': 180.9,
};

// ── Recent signals (last 1h) ─────────────────────────────────────────────────

export interface MockSignal extends Signal {
  featuresHuman: string;
}

export const mockSignals: MockSignal[] = [
  {
    id: uuid(20),
    market: 'KRW-XRP',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 2 * HOUR - 20 * MIN,
    triggerPrice: 820,
    features: { rvol: 2.4, boxRangePct: 0.8, rsiAccel: 1.3, ema50Above: true },
    decision: 'entered',
    positionId: uuid(1),
    featuresHuman: 'RVOL 2.4 · 박스 +0.8% · RSI 가속+',
  },
  {
    id: uuid(21),
    market: 'KRW-BTC',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 70 * MIN,
    triggerPrice: 116_200_000,
    features: { rvol: 1.8, boxRangePct: 0.5, rsiAccel: 0.9, ema50Above: true },
    decision: 'rejected_protected',
    positionId: null,
    featuresHuman: '보호 종목 (BTC 보유 중)',
  },
  {
    id: uuid(28),
    market: 'KRW-SOL',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 62 * MIN,
    triggerPrice: 185_400,
    features: { rvol: 1.6, boxRangePct: 1.2, rsiAccel: 0.4, ema50Above: true },
    decision: 'rejected_capcap',
    positionId: null,
    featuresHuman: '포지션 자본 캡 초과',
  },
  {
    id: uuid(22),
    market: 'KRW-DOGE',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 49 * MIN,
    triggerPrice: 182,
    features: { rvol: 3.1, boxRangePct: 0.6, rsiAccel: 2.1, ema50Above: true },
    decision: 'entered',
    positionId: uuid(2),
    featuresHuman: 'RVOL 3.1 · 박스 +0.6% · RSI 가속+',
  },
  {
    id: uuid(23),
    market: 'KRW-AVAX',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 38 * MIN,
    triggerPrice: 41_200,
    features: { rvol: 2.8, boxRangePct: 1.1, rsiAccel: 0.9, ema50Above: false },
    decision: 'rejected_concurrent',
    positionId: null,
    featuresHuman: '동시 보유 한도 도달 (3/3)',
  },
  {
    id: uuid(24),
    market: 'KRW-NEAR',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 28 * MIN,
    triggerPrice: 6_340,
    features: { rvol: 1.9, boxRangePct: 1.4, rsiAccel: 0.2, ema50Above: true },
    decision: 'rejected_btccrash',
    positionId: null,
    featuresHuman: 'BTC 급락 (-2.1% / 5m)',
  },
  {
    id: uuid(29),
    market: 'KRW-LINK',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 22 * MIN,
    triggerPrice: 24_850,
    features: { rvol: 2.1, boxRangePct: 0.9, rsiAccel: 1.0, ema50Above: true },
    decision: 'rejected_dd',
    positionId: null,
    featuresHuman: '일일 손실 한도 도달 (-3.2%)',
  },
  {
    id: uuid(25),
    market: 'KRW-ETH',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 14 * MIN,
    triggerPrice: 4_823_000,
    features: { rvol: 2.2, boxRangePct: 0.9, rsiAccel: 1.6, ema50Above: true },
    decision: 'rejected_cooldown',
    positionId: null,
    featuresHuman: '30분 쿨다운 (22분 남음)',
  },
  {
    id: uuid(27),
    market: 'KRW-SOL',
    strategy: 'box_breakout_a',
    detectedAt: NOW - 2 * MIN,
    triggerPrice: 186_100,
    features: { rvol: 2.6, boxRangePct: 1.0, rsiAccel: 1.1, ema50Above: true },
    decision: 'rejected_kill',
    positionId: null,
    featuresHuman: 'KILL 활성',
  },
];

// ── Recent trades (24h) ───────────────────────────────────────────────────────

export const mockTrades: Array<{
  id: string;
  market: string;
  entryPrice: number;
  exitPrice: number;
  entryAt: number;
  exitAt: number;
  pnlKrw: number;
  pnlPct: number;
  exitReason: string;
}> = [
  {
    id: uuid(30),
    market: 'KRW-ETH',
    entryPrice: 4_782_000,
    exitPrice: 4_841_000,
    entryAt: NOW - 22 * HOUR,
    exitAt: NOW - 21 * HOUR - 12 * MIN,
    pnlKrw: 18_400,
    pnlPct: 1.23,
    exitReason: 'tp1',
  },
  {
    id: uuid(31),
    market: 'KRW-SOL',
    entryPrice: 184_200,
    exitPrice: 181_800,
    entryAt: NOW - 18 * HOUR,
    exitAt: NOW - 17 * HOUR - 30 * MIN,
    pnlKrw: -5_020,
    pnlPct: -1.3,
    exitReason: 'sl',
  },
  {
    id: uuid(32),
    market: 'KRW-NEAR',
    entryPrice: 6_180,
    exitPrice: 6_420,
    entryAt: NOW - 14 * HOUR,
    exitAt: NOW - 12 * HOUR - 45 * MIN,
    pnlKrw: 11_200,
    pnlPct: 3.88,
    exitReason: 'trailing',
  },
  {
    id: uuid(33),
    market: 'KRW-AVAX',
    entryPrice: 40_800,
    exitPrice: 40_400,
    entryAt: NOW - 8 * HOUR,
    exitAt: NOW - 7 * HOUR - 50 * MIN,
    pnlKrw: -3_820,
    pnlPct: -0.98,
    exitReason: 'sl',
  },
  {
    id: uuid(34),
    market: 'KRW-ETH',
    entryPrice: 4_801_000,
    exitPrice: 4_852_000,
    entryAt: NOW - 5 * HOUR,
    exitAt: NOW - 4 * HOUR - 20 * MIN,
    pnlKrw: 14_800,
    pnlPct: 1.06,
    exitReason: 'tp1',
  },
];

// ── Daily stats (7 days) ──────────────────────────────────────────────────────

export const mockDailyStats: DailyStats[] = [
  {
    date: '2026-05-11',
    tradesCount: 4,
    wins: 3,
    losses: 1,
    grossPnlKrw: 22_400,
    feesKrw: 820,
    netPnlKrw: 21_580,
    maxDdPct: 0.8,
    startingCapital: 940_000,
    endingCapital: 961_580,
  },
  {
    date: '2026-05-12',
    tradesCount: 6,
    wins: 4,
    losses: 2,
    grossPnlKrw: 18_200,
    feesKrw: 1_100,
    netPnlKrw: 17_100,
    maxDdPct: 1.2,
    startingCapital: 961_580,
    endingCapital: 978_680,
  },
  {
    date: '2026-05-13',
    tradesCount: 2,
    wins: 1,
    losses: 1,
    grossPnlKrw: -3_200,
    feesKrw: 480,
    netPnlKrw: -3_680,
    maxDdPct: 2.1,
    startingCapital: 978_680,
    endingCapital: 975_000,
  },
  {
    date: '2026-05-14',
    tradesCount: 5,
    wins: 3,
    losses: 2,
    grossPnlKrw: 11_800,
    feesKrw: 920,
    netPnlKrw: 10_880,
    maxDdPct: 1.0,
    startingCapital: 975_000,
    endingCapital: 985_880,
  },
  {
    date: '2026-05-15',
    tradesCount: 3,
    wins: 2,
    losses: 1,
    grossPnlKrw: 7_400,
    feesKrw: 620,
    netPnlKrw: 6_780,
    maxDdPct: 0.6,
    startingCapital: 985_880,
    endingCapital: 992_660,
  },
  {
    date: '2026-05-16',
    tradesCount: 4,
    wins: 2,
    losses: 2,
    grossPnlKrw: -4_800,
    feesKrw: 740,
    netPnlKrw: -5_540,
    maxDdPct: 1.8,
    startingCapital: 992_660,
    endingCapital: 987_120,
  },
  {
    date: '2026-05-17',
    tradesCount: 3,
    wins: 2,
    losses: 1,
    grossPnlKrw: 13_440,
    feesKrw: 590,
    netPnlKrw: 12_850,
    maxDdPct: 0.5,
    startingCapital: 987_120,
    endingCapital: 1_000_000,
  },
];

// Signal display metadata
export const SIGNAL_DECISION_LABELS: Record<string, string> = {
  entered: '진입',
  rejected_protected: '보호종목',
  rejected_capcap: '자본한도',
  rejected_cooldown: '쿨다운',
  rejected_concurrent: '동시보유',
  rejected_btccrash: 'BTC급락',
  rejected_dd: '손실한도',
  rejected_kill: 'KILL',
};

export const SIGNAL_DECISION_VARIANTS: Record<
  string,
  'entered' | 'warn' | 'neutral'
> = {
  entered: 'entered',
  rejected_protected: 'neutral',
  rejected_capcap: 'neutral',
  rejected_cooldown: 'warn',
  rejected_concurrent: 'warn',
  rejected_btccrash: 'warn',
  rejected_dd: 'warn',
  rejected_kill: 'neutral',
};

export const EXIT_REASON_LABELS: Record<string, string> = {
  sl: '손절',
  tp1: '1차익절',
  tp2: '2차익절',
  trailing: '트레일링',
  time: '시간컷',
  kill: 'KILL',
  btc_crash: 'BTC급락',
  manual: '수동',
  reconcile: '정산',
};
