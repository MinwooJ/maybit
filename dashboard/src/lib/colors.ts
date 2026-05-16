/**
 * Korean trading convention color tokens.
 * Red = up/profit (Upbit/KRW convention)
 * Blue = down/loss
 *
 * These map to CSS variables defined in globals.css
 */

export const priceColors = {
  up: 'text-price-up',
  down: 'text-price-down',
  neutral: 'text-muted-foreground',
} as const;

export const bgPriceColors = {
  up: 'bg-price-up/10 text-price-up',
  down: 'bg-price-down/10 text-price-down',
  neutral: 'bg-muted text-muted-foreground',
} as const;

export function getPnlColorClass(pnl: number): string {
  if (pnl > 0) return priceColors.up;
  if (pnl < 0) return priceColors.down;
  return priceColors.neutral;
}

export function getPnlBadgeClass(pnl: number): string {
  if (pnl > 0) return bgPriceColors.up;
  if (pnl < 0) return bgPriceColors.down;
  return bgPriceColors.neutral;
}
