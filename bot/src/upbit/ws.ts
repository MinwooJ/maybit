import { randomUUID } from 'node:crypto';
import { UPBIT_WS_PUBLIC, WS_PING_INTERVAL_MS } from '@maybit/shared';
import WebSocket, { type RawData } from 'ws';
import { logger } from '../logger.js';

export interface UpbitTicker {
  type: 'ticker';
  code: string;
  trade_price: number;
  change: 'RISE' | 'EVEN' | 'FALL';
  change_rate: number;
  signed_change_rate: number;
  acc_trade_price_24h: number;
  acc_trade_volume_24h: number;
  trade_volume: number;
  trade_timestamp: number;
  timestamp: number;
}

export interface UpbitWsManagerOptions {
  codes: string[];
  onTicker: (msg: UpbitTicker) => void;
}

const MAX_RECONNECT_DELAY_MS = 30_000;

export class UpbitWsManager {
  private readonly codes: string[];
  private readonly onTicker: (msg: UpbitTicker) => void;
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelayMs = 1000;
  private stopped = false;

  constructor(opts: UpbitWsManagerOptions) {
    this.codes = opts.codes;
    this.onTicker = opts.onTicker;
  }

  start(): void {
    if (this.stopped) return;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.ws?.close();
  }

  private connect(): void {
    logger.info({ codes: this.codes.length }, 'upbit ws connecting');
    const ws = new WebSocket(UPBIT_WS_PUBLIC);
    this.ws = ws;
    ws.on('open', () => this.handleOpen());
    ws.on('message', (data) => this.handleMessage(data));
    ws.on('close', (code, reason) => this.handleClose(code, reason.toString()));
    ws.on('error', (err) => logger.error({ err: err.message }, 'upbit ws error'));
    ws.on('pong', () => logger.debug('upbit ws pong'));
  }

  private handleOpen(): void {
    this.reconnectDelayMs = 1000;
    const subscribe = [
      { ticket: randomUUID() },
      { type: 'ticker', codes: this.codes },
      { format: 'DEFAULT' },
    ];
    this.ws?.send(JSON.stringify(subscribe));
    logger.info({ codes: this.codes.length }, 'upbit ws subscribed to ticker');

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, WS_PING_INTERVAL_MS);
  }

  private handleMessage(data: RawData): void {
    try {
      const msg = JSON.parse(data.toString()) as Partial<UpbitTicker> & { type?: string };
      if (msg.type === 'ticker') {
        this.onTicker(msg as UpbitTicker);
      }
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'upbit ws parse failed');
    }
  }

  private handleClose(code: number, reason: string): void {
    this.clearTimers();
    if (this.stopped) {
      logger.info({ code, reason }, 'upbit ws closed (stop requested)');
      return;
    }
    logger.warn(
      { code, reason, retryMs: this.reconnectDelayMs },
      'upbit ws closed, scheduling reconnect',
    );
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelayMs);
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
  }

  private clearTimers(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
