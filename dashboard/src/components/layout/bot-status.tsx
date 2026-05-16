"use client";

import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mockBotStatus } from "@/lib/mock";
import { formatDuration } from "@/lib/format";

const STATE_CONFIG = {
  active: {
    dotClass: "text-green-500",
    label: "활성",
    tooltipLabel: "WebSocket 연결됨",
  },
  degraded: {
    dotClass: "text-amber-400",
    label: "재연결 중",
    tooltipLabel: "WebSocket 재연결 중",
  },
  stopped: {
    dotClass: "text-red-500",
    label: "정지됨",
    tooltipLabel: "봇 정지됨",
  },
} as const;

const TICK_INTERVAL_MS = 200;
const TICK_RESET_AT_MS = 5000;

export function BotStatusPill() {
  const { state, lastTickMs, uptimeMs } = mockBotStatus;
  const cfg = STATE_CONFIG[state];
  const uptimeLabel = `봇 가동 ${formatDuration(uptimeMs)}`;

  const [ticksAgoMs, setTicksAgoMs] = useState(lastTickMs);

  useEffect(() => {
    if (state !== "active") return;
    const id = setInterval(() => {
      setTicksAgoMs((prev) => {
        const next = prev + TICK_INTERVAL_MS;
        return next >= TICK_RESET_AT_MS ? lastTickMs : next;
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state, lastTickMs]);

  const tickLabel = state === "active"
    ? `${(ticksAgoMs / 1000).toFixed(1)}s`
    : state === "degraded"
      ? "12s"
      : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5",
            "font-mono text-[10px] leading-none cursor-default select-none"
          )}
        >
          <Circle
            className={cn("h-2 w-2 fill-current shrink-0", cfg.dotClass)}
            aria-hidden
          />
          <span className="text-muted-foreground">{cfg.label}</span>
          {tickLabel && (
            <span className="text-muted-foreground/60">
              · {tickLabel}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-mono text-xs">
        {cfg.tooltipLabel} · {uptimeLabel}
        {state === "active" && ` · 마지막 tick ${(ticksAgoMs / 1000).toFixed(1)}s 전`}
      </TooltipContent>
    </Tooltip>
  );
}
