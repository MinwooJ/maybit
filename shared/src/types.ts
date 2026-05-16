import type { z } from 'zod';
import type {
  BotPositionSchema,
  ConfigSchema,
  DailyStatsSchema,
  ExitReasonSchema,
  MarketCodeSchema,
  OrderStateSchema,
  OrderTypeSchema,
  PositionStatusSchema,
  ProtectedCoinSchema,
  SignalDecisionSchema,
  SignalSchema,
  StrategyParamsSchema,
  TradeSchema,
  TradeSideSchema,
} from './schemas.js';

export type MarketCode = z.infer<typeof MarketCodeSchema>;
export type PositionStatus = z.infer<typeof PositionStatusSchema>;
export type ExitReason = z.infer<typeof ExitReasonSchema>;
export type BotPosition = z.infer<typeof BotPositionSchema>;
export type TradeSide = z.infer<typeof TradeSideSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderState = z.infer<typeof OrderStateSchema>;
export type Trade = z.infer<typeof TradeSchema>;
export type SignalDecision = z.infer<typeof SignalDecisionSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type ProtectedCoin = z.infer<typeof ProtectedCoinSchema>;
export type StrategyParams = z.infer<typeof StrategyParamsSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type DailyStats = z.infer<typeof DailyStatsSchema>;
