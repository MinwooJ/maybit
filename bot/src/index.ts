import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { ConfigSchema } from '@maybit/shared';
import { logger } from './logger.js';
import { UpbitWsManager, fetchKrwMarkets } from './upbit/index.js';
import type { UpbitTicker } from './upbit/index.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';
const REPORT_INTERVAL_MS = 10_000;

function now(): string {
  return dayjs().tz(KST).format('YYYY-MM-DD HH:mm:ss');
}

interface TickerStats {
  received: number;
  distinct: Set<string>;
  latestByCode: Map<string, UpbitTicker>;
}

async function bootstrap(): Promise<void> {
  logger.info({ at: now(), tz: KST }, 'maybit bot starting');

  const defaultConfig = ConfigSchema.parse({ strategyParams: {} });
  logger.info({ mode: defaultConfig.mode }, 'default config validated');

  const markets = await fetchKrwMarkets();
  const codes = markets.map((m) => m.code);
  logger.info(
    { total: markets.length, caution: markets.filter((m) => m.caution).length },
    'fetched KRW markets',
  );

  const stats: TickerStats = {
    received: 0,
    distinct: new Set(),
    latestByCode: new Map(),
  };

  const ws = new UpbitWsManager({
    codes,
    onTicker: (msg) => {
      stats.received += 1;
      stats.distinct.add(msg.code);
      stats.latestByCode.set(msg.code, msg);
    },
  });
  ws.start();

  const report = setInterval(() => {
    const btc = stats.latestByCode.get('KRW-BTC');
    logger.info(
      {
        at: now(),
        received: stats.received,
        distinctCodes: stats.distinct.size,
        btcPrice: btc?.trade_price ?? null,
        btcChangePct: btc ? (btc.signed_change_rate * 100).toFixed(2) : null,
      },
      'ticker report',
    );
  }, REPORT_INTERVAL_MS);

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal, at: now() }, 'shutting down');
    clearInterval(report);
    ws.stop();
    setTimeout(() => process.exit(0), 200);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('bot running — Phase 0 PoC: WebSocket ticker stream only');
}

bootstrap().catch((err) => {
  logger.error({ err: (err as Error).message }, 'bootstrap failed');
  process.exit(1);
});
