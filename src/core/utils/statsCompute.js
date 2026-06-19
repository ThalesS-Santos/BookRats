import { BOOK_STATUS } from '@core/constants/bookStatus';

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export function dateKey(date) {
  const d = date instanceof Date ? date : new Date(date + 'T12:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getPeriodCutoff(period) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === 'semana') { const d = new Date(now); d.setDate(now.getDate() - 6); return d; }
  if (period === 'mes') { const d = new Date(now); d.setDate(now.getDate() - 29); return d; }
  if (period === 'trimestre') { const d = new Date(now); d.setDate(now.getDate() - 89); return d; }
  return new Date(0);
}

export function getPeriodDays(period) {
  if (period === 'semana') return 7;
  if (period === 'mes') return 30;
  if (period === 'trimestre') return 90;
  return 365;
}

export function extractAllLogs(books) {
  return books.flatMap(b =>
    (b.logs || []).map(l => ({ ...l, bookId: b.id, bookTitle: b.title })),
  );
}

export function computeDailyPages(allLogs, days) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = dateKey(d);
    const pages = allLogs
      .filter(l => l.date === key)
      .reduce((s, l) => s + (l.pagesRead || 0), 0);
    return { label: DAYS_PT[d.getDay()], shortLabel: DAYS_PT[d.getDay()][0], pages, key };
  });
}

export function computeWeeklyPages(allLogs, weeksCount) {
  const today = new Date();
  return Array.from({ length: weeksCount }, (_, i) => {
    const daysBack = (weeksCount - 1 - i) * 7;
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - daysBack);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const pages = allLogs
      .filter(l => {
        const ld = new Date(l.date + 'T12:00:00');
        return ld >= weekStart && ld <= weekEnd;
      })
      .reduce((s, l) => s + (l.pagesRead || 0), 0);
    return { label: `${weekStart.getDate()}/${MONTHS_PT[weekStart.getMonth()]}`, pages };
  });
}

export function computeMonthlyPages(allLogs, monthsCount) {
  const today = new Date();
  return Array.from({ length: monthsCount }, (_, i) => {
    const offset = monthsCount - 1 - i;
    let monthIdx = today.getMonth() - offset;
    let yr = today.getFullYear();
    while (monthIdx < 0) { monthIdx += 12; yr -= 1; }
    const pages = allLogs
      .filter(l => {
        const d = new Date(l.date + 'T12:00:00');
        return d.getFullYear() === yr && d.getMonth() === monthIdx;
      })
      .reduce((s, l) => s + (l.pagesRead || 0), 0);
    return { label: MONTHS_PT[monthIdx], pages };
  });
}

export function computeHeatMap(allLogs, days) {
  const result = {};
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result[dateKey(d)] = 0;
  }
  allLogs.forEach(l => {
    if (Object.prototype.hasOwnProperty.call(result, l.date)) {
      result[l.date] += l.pagesRead || 0;
    }
  });
  return result;
}

export function computeGenreDistribution(books) {
  const readBooks = books.filter(b => b.status === BOOK_STATUS.READ);
  const counts = {};
  readBooks.forEach(b => {
    (b.categories || []).forEach(cat => {
      const g = cat.trim();
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

export function computeAverageSpeed(logs) {
  const valid = logs.filter(l => l.pagesRead > 0 && l.timeSeconds > 60);
  if (!valid.length) return 0;
  const total = valid.reduce((sum, l) => sum + (l.pagesRead / l.timeSeconds) * 3600, 0);
  return Math.round(total / valid.length);
}

export function computeAvgPagesPerDay(logs, days) {
  if (!logs.length || days <= 0) return 0;
  const total = logs.reduce((sum, l) => sum + (l.pagesRead || 0), 0);
  return Math.round((total / days) * 10) / 10;
}

export function computeSessionMetrics(allLogs) {
  const valid = allLogs.filter(l => l.timeSeconds > 0);
  if (!valid.length) {
    return { avgDuration: 0, maxDuration: 0, totalSessions: 0, totalTimeSeconds: 0 };
  }
  const totalTime = valid.reduce((s, l) => s + l.timeSeconds, 0);
  return {
    avgDuration: Math.round(totalTime / valid.length),
    maxDuration: Math.max(...valid.map(l => l.timeSeconds)),
    totalSessions: valid.length,
    totalTimeSeconds: totalTime,
  };
}

export function computeProjections(readingBooks, avgPagesPerDay) {
  if (avgPagesPerDay <= 0.5) return [];
  return readingBooks
    .map(b => {
      const remaining = Math.max(0, (b.totalPages || 0) - (b.currentPage || 0));
      if (remaining <= 0) return null;
      const daysLeft = Math.ceil(remaining / avgPagesPerDay);
      const finishDate = new Date();
      finishDate.setDate(finishDate.getDate() + daysLeft);
      return {
        id: b.id,
        title: b.title,
        remaining,
        daysLeft,
        finishDate,
        progress: b.totalPages > 0 ? (b.currentPage || 0) / b.totalPages : 0,
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

export function computeDayOfWeekPattern(allLogs) {
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  allLogs.forEach(l => {
    const idx = new Date(l.date + 'T12:00:00').getDay();
    byDay[idx] += l.pagesRead || 0;
  });
  return DAYS_PT.map((label, i) => ({ label, pages: byDay[i] }));
}

export function computeLibrarySnapshot(books) {
  const counts = {
    [BOOK_STATUS.READING]: 0,
    [BOOK_STATUS.READ]: 0,
    [BOOK_STATUS.WANT_TO_READ]: 0,
    [BOOK_STATUS.WISH_LIST]: 0,
    [BOOK_STATUS.DROPPED]: 0,
    [BOOK_STATUS.BOUGHT]: 0,
    [BOOK_STATUS.RECOMMENDED]: 0,
  };
  books.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
  return {
    reading: counts[BOOK_STATUS.READING],
    read: counts[BOOK_STATUS.READ],
    wantToRead: counts[BOOK_STATUS.WANT_TO_READ] + counts[BOOK_STATUS.WISH_LIST],
    dropped: counts[BOOK_STATUS.DROPPED],
    bought: counts[BOOK_STATUS.BOUGHT],
    recommended: counts[BOOK_STATUS.RECOMMENDED],
    total: books.length,
  };
}

export function formatDuration(seconds) {
  if (!seconds) return '0min';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h${rem}min` : `${hrs}h`;
}

export function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return String(Math.round(n));
}

export function formatDate(date) {
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}
