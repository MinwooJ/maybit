import { z } from 'zod';

export const MarketCodeSchema = z.string().regex(/^KRW-[A-Z0-9]+$/);

export const PositionStatusSchema = z.enum(['open', 'closing', 'closed']);

export const ExitReasonSchema = z.enum([
  'sl',
  'tp1',
  'tp2',
  'trailing',
  'time',
  'kill',
  'btc_crash',
  'manual',
  'reconcile',
]);

export const BotPositionSchema = z.object({
  id: z.string().uuid(),
  market: MarketCodeSchema,
  status: PositionStatusSchema,
  entrySignalId: z.string().uuid().nullable(),
  entryOrderId: z.string().nullable(),
  entryPrice: z.number().nullable(),
  entryQty: z.number().nullable(),
  entryKrw: z.number().nullable(),
  entryAt: z.number().int().nullable(),
  stopLossPrice: z.number().nullable(),
  tp1Price: z.number().nullable(),
  tp1Filled: z.boolean(),
  trailingPrice: z.number().nullable(),
  exitOrderId: z.string().nullable(),
  exitPrice: z.number().nullable(),
  exitQty: z.number().nullable(),
  exitKrw: z.number().nullable(),
  exitAt: z.number().int().nullable(),
  exitReason: ExitReasonSchema.nullable(),
  pnlKrw: z.number().nullable(),
  pnlPct: z.number().nullable(),
  feesKrw: z.number().nullable(),
});

export const TradeSideSchema = z.enum(['buy', 'sell']);
export const OrderTypeSchema = z.enum(['market', 'limit']);
export const OrderStateSchema = z.enum(['wait', 'filled', 'partial', 'cancelled', 'failed']);

export const TradeSchema = z.object({
  id: z.string().uuid(),
  positionId: z.string().uuid(),
  side: TradeSideSchema,
  market: MarketCodeSchema,
  orderType: OrderTypeSchema,
  upbitUuid: z.string().nullable(),
  clientOrderId: z.string().uuid(),
  requestedQty: z.number(),
  requestedPrice: z.number().nullable(),
  filledQty: z.number(),
  filledPrice: z.number().nullable(),
  state: OrderStateSchema,
  feeKrw: z.number().nullable(),
  placedAt: z.number().int(),
  filledAt: z.number().int().nullable(),
});

export const SignalDecisionSchema = z.enum([
  'entered',
  'rejected_protected',
  'rejected_capcap',
  'rejected_cooldown',
  'rejected_concurrent',
  'rejected_btccrash',
  'rejected_dd',
  'rejected_kill',
]);

export const SignalSchema = z.object({
  id: z.string().uuid(),
  market: MarketCodeSchema,
  strategy: z.string(),
  detectedAt: z.number().int(),
  triggerPrice: z.number(),
  features: z.record(z.string(), z.unknown()),
  decision: SignalDecisionSchema,
  positionId: z.string().uuid().nullable(),
});

export const ProtectedCoinSchema = z.object({
  market: MarketCodeSchema,
  reason: z.enum(['auto_initial_holding', 'manual']),
  note: z.string().nullable(),
  addedAt: z.number().int(),
  addedBy: z.string(),
});

export const StrategyParamsSchema = z.object({
  rvolMin: z.number().positive().default(2.0),
  boxWindow: z.number().int().positive().default(10),
  boxMaxRangePct: z.number().positive().default(1.5),
  rsiAccelMin: z.number().default(0),
  ema50Filter: z.boolean().default(true),
  atrPeriod: z.number().int().positive().default(14),
  slAtrMult: z.number().positive().default(1.5),
  tp1AtrMult: z.number().positive().default(2.0),
  trailingAtrMult: z.number().positive().default(1.5),
  timeCutMin: z.number().int().positive().default(240),
});

export const ConfigSchema = z.object({
  killSwitch: z.boolean().default(false),
  mode: z.enum(['paper', 'live']).default('paper'),
  botCapitalKrw: z.number().nonnegative().default(0),
  maxPositionKrw: z.number().nonnegative().default(500000),
  riskPerTradePct: z.number().positive().max(5).default(0.5),
  maxConcurrent: z.number().int().positive().default(3),
  dailyLossPct: z.number().positive().default(5),
  weeklyLossPct: z.number().positive().default(10),
  cooldownMin: z.number().int().nonnegative().default(30),
  btcCrashThresholdPct: z.number().negative().default(-2),
  strategyParams: StrategyParamsSchema,
});

export const DailyStatsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tradesCount: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  grossPnlKrw: z.number(),
  feesKrw: z.number().nonnegative(),
  netPnlKrw: z.number(),
  maxDdPct: z.number(),
  startingCapital: z.number().nonnegative(),
  endingCapital: z.number().nonnegative(),
});
