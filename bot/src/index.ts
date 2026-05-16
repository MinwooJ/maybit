import './env.js';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { ConfigSchema } from '@maybit/shared';
import { logger } from './logger.js';
import { DISCORD_COLOR, notifyDiscord } from './notify/index.js';
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

  await notifyDiscord(null, [
    {
      title: '🟢 maybit bot started',
      color: DISCORD_COLOR.success,
      fields: [
        { name: 'mode', value: defaultConfig.mode, inline: true },
        { name: 'KRW markets', value: String(markets.length), inline: true },
        { name: 'at (KST)', value: now(), inline: false },
      ],
    },
  ]);

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

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal, at: now() }, 'shutting down');
    clearInterval(report);
    ws.stop();
    notifyDiscord(null, [
      {
        title: '🔴 maybit bot stopped',
        color: DISCORD_COLOR.warn,
        fields: [
          { name: 'signal', value: signal, inline: true },
          { name: 'at (KST)', value: now(), inline: true },
          { name: 'ticks received', value: String(stats.received), inline: true },
        ],
      },
    ]).finally(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('bot running — Phase 0 PoC: WebSocket ticker stream + Discord lifecycle');
}

bootstrap().catch((err) => {
  logger.error({ err: (err as Error).message }, 'bootstrap failed');
  notifyDiscord(null, [
    {
      title: '⚠️ maybit bot failed to start',
      color: DISCORD_COLOR.critical,
      description: (err as Error).message,
    },
  ]).finally(() => process.exit(1));
});
