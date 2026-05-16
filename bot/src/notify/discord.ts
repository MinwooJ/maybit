import { logger } from '../logger.js';

const DISCORD_USERNAME = 'maybit';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
}

export const DISCORD_COLOR = {
  info: 0x3498db,
  success: 0x2ecc71,
  warn: 0xf1c40f,
  error: 0xe74c3c,
  critical: 0x992d22,
} as const;

interface DiscordPayload {
  username: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

export async function notifyDiscord(
  content: string | null,
  embeds?: DiscordEmbed[],
): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    logger.debug({ content }, 'discord disabled (DISCORD_WEBHOOK_URL not set)');
    return;
  }

  const payload: DiscordPayload = { username: DISCORD_USERNAME };
  if (content) payload.content = content;
  if (embeds) payload.embeds = embeds;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body: body.slice(0, 200) }, 'discord send failed');
    }
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'discord send error');
  }
}
