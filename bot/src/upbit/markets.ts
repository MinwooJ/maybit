import { UPBIT_REST_BASE } from '@maybit/shared';
import { z } from 'zod';

const MarketEntrySchema = z.object({
  market: z.string(),
  korean_name: z.string(),
  english_name: z.string(),
  market_warning: z.enum(['NONE', 'CAUTION']).optional(),
});

const MarketListSchema = z.array(MarketEntrySchema);

export interface KrwMarket {
  code: string;
  korean: string;
  english: string;
  caution: boolean;
}

export async function fetchKrwMarkets(): Promise<KrwMarket[]> {
  const res = await fetch(`${UPBIT_REST_BASE}/v1/market/all?isDetails=true`);
  if (!res.ok) {
    throw new Error(`fetchKrwMarkets failed: HTTP ${res.status}`);
  }
  const parsed = MarketListSchema.parse(await res.json());
  return parsed
    .filter((m) => m.market.startsWith('KRW-'))
    .map((m) => ({
      code: m.market,
      korean: m.korean_name,
      english: m.english_name,
      caution: m.market_warning === 'CAUTION',
    }));
}
