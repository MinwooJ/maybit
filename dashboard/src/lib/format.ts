/**
 * Formatting helpers for KRW amounts, percentages, and KST timestamps.
 */

const krwFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const krwCompactFormatter = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 1,
});

export function formatKrw(amount: number): string {
  return krwFormatter.format(amount);
}

export function formatKrwCompact(amount: number): string {
  return krwCompactFormatter.format(amount);
}

export function formatPct(pct: number, showSign = true): string {
  const sign = showSign ? (pct >= 0 ? '+' : '') : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatPctChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

/** KST HH:mm:ss for recent events */
export function formatTimeKst(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** KST MM/DD HH:mm for older events */
export function formatDateTimeKst(epochMs: number): string {
  const d = new Date(epochMs);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  return d.toLocaleString('ko-KR', opts).replace('. ', '/').replace('. ', ' ');
}

/** Duration: hours and minutes from ms */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  return `${hours}시간 ${minutes}분`;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return new Intl.NumberFormat('ko-KR').format(Math.round(price));
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  return price.toFixed(4);
}
