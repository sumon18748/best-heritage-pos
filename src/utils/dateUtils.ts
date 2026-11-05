/**
 * Date and Time utilities for Best Heritage POS
 * Standard Timezone: Asia/Dhaka (Bangladesh Standard Time, BST / UTC+6)
 */

export const BANGLADESH_TIMEZONE = 'Asia/Dhaka';

/**
 * Returns current date in Bangladesh (Asia/Dhaka) formatted as YYYY-MM-DD
 */
export function getBangladeshTodayDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BANGLADESH_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    // Fallback: add 6 hours (UTC+6)
    const offsetMs = 6 * 60 * 60 * 1000;
    const bdDate = new Date(d.getTime() + offsetMs);
    const y = bdDate.getUTCFullYear();
    const m = String(bdDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(bdDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Returns compact YYYYMMDD date string in Bangladesh time for reference numbers (e.g. 20261027)
 */
export function getBangladeshDateCompact(d: Date = new Date()): string {
  return getBangladeshTodayDateString(d).replace(/-/g, '');
}

/**
 * Returns formatted 12-hour time string in Bangladesh time (e.g. "01:45:00 AM")
 */
export function getBangladeshTimeString(d: Date = new Date()): string {
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: BANGLADESH_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return d.toLocaleTimeString();
  }
}

/**
 * Returns 24-hour HH:mm time string in Bangladesh time for HTML5 <input type="time" />
 */
export function getBangladeshCurrentTimeString(d: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: BANGLADESH_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === 'hour')?.value || '12';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${hour}:${minute}`;
  } catch {
    const offsetMs = 6 * 60 * 60 * 1000;
    const bd = new Date(d.getTime() + offsetMs);
    const h = String(bd.getUTCHours()).padStart(2, '0');
    const m = String(bd.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Converts 24h time "HH:mm" to 12h "hh:mm A" (e.g. "14:30" -> "02:30 PM")
 */
export function formatTime12Hour(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) {
    return timeStr;
  }
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    }
  }
  return timeStr;
}

/**
 * Extracts and formats the 12-hour entry time for a transaction record (Sale, Stock, etc.)
 */
export function formatSaleTime(sale: { time?: string; createdAt?: string; id?: string }): string {
  if (sale.time) {
    return formatTime12Hour(sale.time);
  }

  if (sale.createdAt) {
    const d = new Date(sale.createdAt);
    if (!isNaN(d.getTime())) {
      try {
        return d.toLocaleTimeString('en-US', {
          timeZone: BANGLADESH_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    }
  }

  if (sale.id) {
    const match = sale.id.match(/\d{10,13}/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed) && parsed > 1000000000) {
        const d = new Date(parsed);
        try {
          return d.toLocaleTimeString('en-US', {
            timeZone: BANGLADESH_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        } catch {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
    }
  }

  return '';
}

/**
 * Returns formatted Date & Time string, e.g. "2026-11-05 (11:15 AM)" or "2026-11-05 11:15 AM"
 */
export function formatSaleDateTime(sale: { date?: string; time?: string; createdAt?: string; id?: string }): string {
  const time = formatSaleTime(sale);
  if (!sale.date) return time;
  return time ? `${sale.date} (${time})` : sale.date;
}

/**
 * Returns formatted human-readable date in Bangladesh time (e.g. "Tue, 27 Oct 2026")
 */
export function getBangladeshFullDateString(d: Date = new Date()): string {
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: BANGLADESH_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Helper to extract sorting timestamp from a transaction record
 */
function getSortTime(item: { createdAt?: string; date?: string; id?: string }): number {
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  // If id has timestamp (e.g. stk_in_173000... or sale_173000...)
  if (item.id) {
    const match = item.id.match(/\d{10,13}/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed) && parsed > 1000000000) return parsed;
    }
  }
  // Fallback to date (e.g. "2026-10-27")
  if (item.date) {
    const t = new Date(item.date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

/**
 * Sorts array of records so that newest / latest transaction is at the top (index 0)
 */
export function sortByNewestFirst<
  T extends {
    id?: string;
    date?: string;
    createdAt?: string;
    referenceNo?: string;
    invoiceNo?: string;
  }
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. Sort by parsed timestamp descending
    const timeA = getSortTime(a);
    const timeB = getSortTime(b);
    if (timeA && timeB && timeA !== timeB) {
      return timeB - timeA;
    }

    // 2. Sort by date string descending
    const dateCmp = (b.date || '').localeCompare(a.date || '');
    if (dateCmp !== 0) return dateCmp;

    // 3. Fallback to reference or ID string descending
    const refA = a.invoiceNo || a.referenceNo || a.id || '';
    const refB = b.invoiceNo || b.referenceNo || b.id || '';
    return refB.localeCompare(refA);
  });
}
