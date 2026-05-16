"use client";

import { useState } from "react";
import { Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatKrw, formatPctChange } from "@/lib/format";
import { mockBtcPrice, mockPositions } from "@/lib/mock";
import { BotStatusPill } from "@/components/layout/bot-status";

export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const [isKilled, setIsKilled] = useState(false);
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [reviveDialogOpen, setReviveDialogOpen] = useState(false);

  const btcChange = mockBtcPrice.change24hPct;
  const btcChangeColor =
    btcChange > 0
      ? "text-price-up"
      : btcChange < 0
        ? "text-price-down"
        : "text-muted-foreground";

  function handleKillButtonClick() {
    if (isKilled) {
      setReviveDialogOpen(true);
    } else {
      setKillDialogOpen(true);
    }
  }

  function confirmKill() {
    setIsKilled(true);
    setKillDialogOpen(false);
  }

  function confirmRevive() {
    setIsKilled(false);
    setReviveDialogOpen(false);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4">
          {/* Mobile wordmark + bot status */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-mono text-base font-bold tracking-tight text-foreground">
              maybit
            </span>
            <BotStatusPill />
          </div>

          <div className="flex-1" />

          {/* BTC price block */}
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-xs font-mono font-semibold text-foreground">
              BTC {formatKrw(mockBtcPrice.price)}
            </span>
            <span className={cn("text-[11px] font-mono", btcChangeColor)}>
              {formatPctChange(btcChange)}
            </span>
          </div>

          <div className="w-px h-5 bg-border hidden sm:block" />

          {/* MODE badge */}
          <Badge className="font-mono text-[11px] font-bold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            PAPER
          </Badge>

          {/* KILL switch */}
          <div className="flex items-center gap-2">
            <Badge
              variant={isKilled ? "destructive" : "outline"}
              className="font-mono text-[10px] hidden sm:inline-flex"
            >
              {isKilled ? "정지" : "정상"}
            </Badge>
            <Button
              size="sm"
              className={cn(
                "h-7 text-xs font-semibold px-3",
                isKilled
                  ? "bg-amber-500 hover:bg-amber-500/90 text-amber-50"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
              onClick={handleKillButtonClick}
              aria-label={isKilled ? "정상화" : "비상 정지"}
            >
              {isKilled ? "정상화" : "비상 정지"}
            </Button>
          </div>

          <div className="w-px h-5 bg-border" />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="테마 전환"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-1.5 px-2" aria-label="계정 메뉴">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-muted">MB</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="text-sm">프로필</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm text-destructive">
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* KILL confirm dialog */}
        <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>비상 정지 확인</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    봇의 신규 진입을 즉시 차단합니다. 현재 보유 중인 포지션은
                    정상 손절/익절 룰을 그대로 따릅니다.{" "}
                    <span className="font-semibold text-foreground">
                      (시장가 일괄 청산 X)
                    </span>
                  </p>
                  <p>
                    정상 운영으로 되돌리려면 같은 자리에서 다시 해제하세요.
                  </p>
                  <p className="text-xs border border-border rounded-md px-3 py-2 bg-muted/40 font-mono">
                    현재 보유 포지션: {mockPositions.length}건 — 자동으로 유지됩니다.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setKillDialogOpen(false)}>
                취소
              </Button>
              <Button variant="destructive" onClick={confirmKill}>
                정지 적용
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* REVIVE confirm dialog */}
        <Dialog open={reviveDialogOpen} onOpenChange={setReviveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>정상 운영으로 복귀</DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground">
                  <p>
                    봇이 다시 신규 진입 신호를 받기 시작합니다. 보유 포지션은
                    계속 정상 룰을 따릅니다.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviveDialogOpen(false)}>
                취소
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-500/90 text-amber-50"
                onClick={confirmRevive}
              >
                정상화
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}
