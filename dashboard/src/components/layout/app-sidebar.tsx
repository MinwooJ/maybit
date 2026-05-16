"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Home,
  Lock,
  ScrollText,
  Settings,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { BotStatusPill } from "@/components/layout/bot-status";

const NAV_OPERATIONAL = [
  { href: "/", label: "홈", icon: Home },
  { href: "/positions", label: "포지션", icon: TrendingUp },
  { href: "/signals", label: "시그널", icon: Zap },
  { href: "/equity", label: "자산곡선", icon: BarChart2 },
  { href: "/backtest", label: "백테스트", icon: FlaskConical },
];

const NAV_ADMIN = [
  { href: "/config", label: "설정", icon: Settings },
  { href: "/protected", label: "보호종목", icon: Lock },
  { href: "/audit", label: "감사로그", icon: ScrollText },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  active: boolean;
}

function NavItem({ href, label, icon: Icon, collapsed, active }: NavItemProps) {
  const item = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return item;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 border-r border-border bg-card transition-all duration-200",
          collapsed ? "w-14" : "w-52"
        )}
      >
        {/* Wordmark */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-border px-4 shrink-0",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <ShieldAlert className="h-5 w-5 text-foreground" />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-base font-bold tracking-tight text-foreground shrink-0">
                maybit
              </span>
              <BotStatusPill />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          {NAV_OPERATIONAL.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              active={
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              }
            />
          ))}

          <Separator className="my-2" />

          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              관리
            </p>
          )}

          {NAV_ADMIN.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", collapsed && "mx-auto flex")}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
