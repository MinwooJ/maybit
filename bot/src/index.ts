import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { ConfigSchema } from '@maybit/shared';
import { logger } from './logger.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';

function now(): string {
  return dayjs().tz(KST).format('YYYY-MM-DD HH:mm:ss');
}

function bootstrap(): void {
  logger.info({ at: now(), tz: KST }, 'maybit bot starting');

  const defaultConfig = ConfigSchema.parse({
    strategyParams: {},
  });
  logger.info({ config: defaultConfig }, 'default config validated');

  const HEARTBEAT_MS = 10_000;
  const heartbeat = setInterval(() => {
    logger.debug({ at: now() }, 'heartbeat');
  }, HEARTBEAT_MS);

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal, at: now() }, 'shutting down');
    clearInterval(heartbeat);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('bot running — Phase 0 scaffold (no trading logic yet)');
}

bootstrap();
