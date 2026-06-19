import { BOOK_STATUS } from '@core/constants/bookStatus';
import {
  DAYS_PT,
  dateKey,
  getPeriodCutoff,
  getPeriodDays,
  extractAllLogs,
  computeDailyPages,
  computeWeeklyPages,
  computeMonthlyPages,
  computeHeatMap,
  computeGenreDistribution,
  computeAverageSpeed,
  computeAvgPagesPerDay,
  computeSessionMetrics,
  computeProjections,
  computeDayOfWeekPattern,
  computeLibrarySnapshot,
  formatDuration,
  formatNumber,
  formatDate,
} from '../../src/core/utils/statsCompute';

describe('statsCompute Helpers', () => {
  describe('dateKey', () => {
    it('formats date object to YYYY-MM-DD', () => {
      const d = new Date(2026, 5, 18); // 18 June 2026 (Month is 0-indexed)
      expect(dateKey(d)).toBe('2026-06-18');
    });

    it('formats string date correctly', () => {
      expect(dateKey('2026-06-18')).toBe('2026-06-18');
    });
  });

  describe('getPeriodDays', () => {
    it('returns correct days count per period key', () => {
      expect(getPeriodDays('semana')).toBe(7);
      expect(getPeriodDays('mes')).toBe(30);
      expect(getPeriodDays('trimestre')).toBe(90);
      expect(getPeriodDays('todo')).toBe(365);
    });
  });

  describe('extractAllLogs', () => {
    it('flattens logs from multiple books', () => {
      const books = [
        {
          id: 'b1',
          title: 'Book 1',
          logs: [{ date: '2026-06-18', pagesRead: 10 }],
        },
        {
          id: 'b2',
          title: 'Book 2',
          logs: [{ date: '2026-06-17', pagesRead: 15 }],
        },
      ];
      const logs = extractAllLogs(books);
      expect(logs).toHaveLength(2);
      expect(logs[0]).toEqual(
        expect.objectContaining({ bookId: 'b1', bookTitle: 'Book 1', pagesRead: 10 }),
      );
    });
  });

  describe('computeDailyPages', () => {
    it('aggregates daily pages for the last N days', () => {
      const logs = [
        { date: dateKey(new Date()), pagesRead: 15 },
        { date: dateKey(new Date()), pagesRead: 10 },
      ];
      const daily = computeDailyPages(logs, 2);
      expect(daily).toHaveLength(2);
      expect(daily[1].pages).toBe(25);
    });
  });

  describe('computeGenreDistribution', () => {
    it('calculates category frequencies of read books', () => {
      const books = [
        { status: BOOK_STATUS.READ, categories: ['Fantasy', 'Sci-Fi'] },
        { status: BOOK_STATUS.READ, categories: ['Fantasy'] },
        { status: BOOK_STATUS.READING, categories: ['Thriller'] }, // should ignore
      ];
      const genres = computeGenreDistribution(books);
      expect(genres).toHaveLength(2);
      expect(genres[0]).toEqual({ genre: 'Fantasy', count: 2 });
      expect(genres[1]).toEqual({ genre: 'Sci-Fi', count: 1 });
    });
  });

  describe('computeAverageSpeed', () => {
    it('returns average speed in pages per hour', () => {
      const logs = [
        { pagesRead: 10, timeSeconds: 600 }, // 1 pág/min = 60 pág/hora
        { pagesRead: 20, timeSeconds: 1200 }, // 1 pág/min = 60 pág/hora
        { pagesRead: 5, timeSeconds: 10 }, // should ignore (too short)
      ];
      expect(computeAverageSpeed(logs)).toBe(60);
    });

    it('returns 0 if no valid logs', () => {
      expect(computeAverageSpeed([])).toBe(0);
    });
  });

  describe('computeAvgPagesPerDay', () => {
    it('returns average pages per day', () => {
      const logs = [{ pagesRead: 30 }, { pagesRead: 60 }];
      expect(computeAvgPagesPerDay(logs, 3)).toBe(30);
    });
  });

  describe('computeSessionMetrics', () => {
    it('calculates average and max session durations', () => {
      const logs = [{ timeSeconds: 600 }, { timeSeconds: 1200 }];
      const metrics = computeSessionMetrics(logs);
      expect(metrics.avgDuration).toBe(900);
      expect(metrics.maxDuration).toBe(1200);
      expect(metrics.totalSessions).toBe(2);
      expect(metrics.totalTimeSeconds).toBe(1800);
    });
  });

  describe('computeProjections', () => {
    it('returns projections for currently reading books', () => {
      const readingBooks = [
        { id: 'b1', title: 'Book 1', currentPage: 10, totalPages: 100 },
      ];
      const projections = computeProjections(readingBooks, 10);
      expect(projections).toHaveLength(1);
      expect(projections[0]).toEqual(
        expect.objectContaining({
          id: 'b1',
          title: 'Book 1',
          remaining: 90,
          daysLeft: 9,
        }),
      );
    });
  });

  describe('computeLibrarySnapshot', () => {
    it('aggregates book statuses count correctly', () => {
      const books = [
        { status: BOOK_STATUS.READING },
        { status: BOOK_STATUS.READING },
        { status: BOOK_STATUS.READ },
      ];
      const snap = computeLibrarySnapshot(books);
      expect(snap.reading).toBe(2);
      expect(snap.read).toBe(1);
      expect(snap.total).toBe(3);
    });
  });

  describe('formatDuration', () => {
    it('formats seconds to human-readable strings', () => {
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(120)).toBe('2min');
      expect(formatDuration(3660)).toBe('1h1min');
      expect(formatDuration(7200)).toBe('2h');
    });
  });

  describe('formatNumber', () => {
    it('formats number to rounded string with K suffix if >= 1000', () => {
      expect(formatNumber(150)).toBe('150');
      expect(formatNumber(1500)).toBe('1.5K');
    });
  });
});

// ---------------------------------------------------------------------------
// Extended coverage with a pinned clock (2026-06-18 Thursday, getDay()=4)
// ---------------------------------------------------------------------------
describe('statsCompute — date-sensitive functions', () => {
  const FIXED = new Date('2026-06-18T12:00:00.000Z'); // Thursday

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED);
  });

  afterAll(() => jest.useRealTimers());

  // ── DAYS_PT ────────────────────────────────────────────────────────────
  describe('DAYS_PT', () => {
    it('has 7 entries starting with Dom', () => {
      expect(DAYS_PT).toHaveLength(7);
      expect(DAYS_PT[0]).toBe('Dom');
      expect(DAYS_PT[6]).toBe('Sáb');
    });
  });

  // ── dateKey ─────────────────────────────────────────────────────────────
  describe('dateKey', () => {
    it('zero-pads month and day', () => {
      expect(dateKey(new Date('2026-03-07T12:00:00'))).toBe('2026-03-07');
    });

    it('handles date strings without timezone shift', () => {
      expect(dateKey('2026-06-18')).toBe('2026-06-18');
    });
  });

  // ── getPeriodCutoff ─────────────────────────────────────────────────────
  describe('getPeriodCutoff', () => {
    it('semana → 6 days before today', () => {
      const cut = getPeriodCutoff('semana');
      const expected = new Date(FIXED);
      expected.setDate(FIXED.getDate() - 6);
      expected.setHours(0, 0, 0, 0);
      expect(cut.toDateString()).toBe(expected.toDateString());
    });

    it('mes → 29 days before today', () => {
      const cut = getPeriodCutoff('mes');
      const expected = new Date(FIXED);
      expected.setDate(FIXED.getDate() - 29);
      expected.setHours(0, 0, 0, 0);
      expect(cut.toDateString()).toBe(expected.toDateString());
    });

    it('trimestre → 89 days before today', () => {
      const cut = getPeriodCutoff('trimestre');
      const expected = new Date(FIXED);
      expected.setDate(FIXED.getDate() - 89);
      expected.setHours(0, 0, 0, 0);
      expect(cut.toDateString()).toBe(expected.toDateString());
    });

    it('todo and unknown → epoch', () => {
      expect(getPeriodCutoff('todo').getTime()).toBe(0);
      expect(getPeriodCutoff('xyz').getTime()).toBe(0);
    });
  });

  // ── computeDailyPages ───────────────────────────────────────────────────
  describe('computeDailyPages — extended', () => {
    it('today (June 18 = Thu) has label Qui', () => {
      const result = computeDailyPages([], 7);
      expect(result[6].label).toBe('Qui'); // index 6 = today
      expect(result[6].key).toBe('2026-06-18');
    });

    it('shortLabel is a single character', () => {
      computeDailyPages([], 7).forEach(d => expect(d.shortLabel).toHaveLength(1));
    });

    it('sums multiple logs on the same day', () => {
      const logs = [
        { date: '2026-06-18', pagesRead: 20, timeSeconds: 600 },
        { date: '2026-06-18', pagesRead: 30, timeSeconds: 900 },
      ];
      expect(computeDailyPages(logs, 1)[0].pages).toBe(50);
    });

    it('ignores logs outside the window', () => {
      const logs = [{ date: '2020-01-01', pagesRead: 500, timeSeconds: 3600 }];
      const result = computeDailyPages(logs, 7);
      expect(result.every(d => d.pages === 0)).toBe(true);
    });
  });

  // ── computeWeeklyPages ──────────────────────────────────────────────────
  describe('computeWeeklyPages', () => {
    it('returns exactly N week entries', () => {
      expect(computeWeeklyPages([], 4)).toHaveLength(4);
    });

    it('last entry contains logs from this week', () => {
      const logs = [{ date: '2026-06-18', pagesRead: 40, timeSeconds: 1800 }];
      const result = computeWeeklyPages(logs, 1);
      expect(result[0].pages).toBe(40);
    });

    it('sums multiple logs in the same week', () => {
      const logs = [
        { date: '2026-06-15', pagesRead: 30, timeSeconds: 900 },
        { date: '2026-06-17', pagesRead: 20, timeSeconds: 600 },
      ];
      const result = computeWeeklyPages(logs, 1);
      expect(result[0].pages).toBe(50);
    });

    it('older weeks get 0 when no matching logs', () => {
      const result = computeWeeklyPages([], 3);
      result.forEach(w => expect(w.pages).toBe(0));
    });

    it('each entry has a non-empty string label', () => {
      computeWeeklyPages([], 2).forEach(w => expect(w.label.length).toBeGreaterThan(0));
    });
  });

  // ── computeMonthlyPages ─────────────────────────────────────────────────
  describe('computeMonthlyPages', () => {
    it('returns exactly N entries', () => {
      expect(computeMonthlyPages([], 6)).toHaveLength(6);
    });

    it('last entry is always the current month (June)', () => {
      expect(computeMonthlyPages([], 3)[2].label).toBe('Jun');
    });

    it('handles year-boundary (7 months from June → December)', () => {
      const result = computeMonthlyPages([], 7);
      expect(result[0].label).toBe('Dez'); // December 2025
      expect(result[6].label).toBe('Jun'); // June 2026
    });

    it('aggregates logs for the correct month', () => {
      const logs = [{ date: '2026-06-10', pagesRead: 99, timeSeconds: 3600 }];
      const result = computeMonthlyPages(logs, 1);
      expect(result[0].pages).toBe(99);
      expect(result[0].label).toBe('Jun');
    });

    it('does not include logs from other months', () => {
      const logs = [{ date: '2026-05-31', pagesRead: 50, timeSeconds: 1800 }];
      const result = computeMonthlyPages(logs, 1); // only June
      expect(result[0].pages).toBe(0);
    });
  });

  // ── computeHeatMap ──────────────────────────────────────────────────────
  describe('computeHeatMap', () => {
    it('returns exactly N date keys', () => {
      expect(Object.keys(computeHeatMap([], 14))).toHaveLength(14);
    });

    it('today is always included', () => {
      const map = computeHeatMap([], 7);
      expect('2026-06-18' in map).toBe(true);
    });

    it('sums pages for matching dates', () => {
      const logs = [
        { date: '2026-06-18', pagesRead: 30, timeSeconds: 900 },
        { date: '2026-06-18', pagesRead: 20, timeSeconds: 600 },
      ];
      expect(computeHeatMap(logs, 7)['2026-06-18']).toBe(50);
    });

    it('ignores logs outside the window', () => {
      const logs = [{ date: '2020-01-01', pagesRead: 999, timeSeconds: 3600 }];
      expect(Object.values(computeHeatMap(logs, 7)).every(v => v === 0)).toBe(true);
    });

    it('initialises all keys at 0', () => {
      Object.values(computeHeatMap([], 7)).forEach(v => expect(v).toBe(0));
    });
  });

  // ── computeDayOfWeekPattern ─────────────────────────────────────────────
  describe('computeDayOfWeekPattern', () => {
    it('returns 7 entries with DAYS_PT labels', () => {
      const result = computeDayOfWeekPattern([]);
      expect(result).toHaveLength(7);
      result.forEach((d, i) => expect(d.label).toBe(DAYS_PT[i]));
    });

    it('returns 0 pages for all days when no logs', () => {
      computeDayOfWeekPattern([]).forEach(d => expect(d.pages).toBe(0));
    });

    it('accumulates pages on the correct weekday', () => {
      // 2026-06-15 is Monday (getDay()=1)
      const logs = [
        { date: '2026-06-15', pagesRead: 40, timeSeconds: 1800 },
        { date: '2026-06-15', pagesRead: 10, timeSeconds: 600 },
      ];
      const result = computeDayOfWeekPattern(logs);
      expect(result[1].pages).toBe(50); // index 1 = Monday (Seg)
      expect(result[1].label).toBe('Seg');
    });

    it('does not cross-contaminate other days', () => {
      const logs = [{ date: '2026-06-18', pagesRead: 10, timeSeconds: 600 }]; // Thursday (4)
      const result = computeDayOfWeekPattern(logs);
      expect(result[4].pages).toBe(10);
      expect([0, 1, 2, 3, 5, 6].every(i => result[i].pages === 0)).toBe(true);
    });
  });

  // ── computeGenreDistribution — edge cases ──────────────────────────────
  describe('computeGenreDistribution — extended', () => {
    const readBook = cats => ({ status: BOOK_STATUS.READ, categories: cats });

    it('trims whitespace from category strings', () => {
      const result = computeGenreDistribution([readBook(['  Fantasy  '])]);
      expect(result[0].genre).toBe('Fantasy');
    });

    it('returns at most 7 genres', () => {
      const books = Array.from({ length: 10 }, (_, i) => readBook([`G${i}`]));
      expect(computeGenreDistribution(books)).toHaveLength(7);
    });

    it('ignores books without categories', () => {
      expect(computeGenreDistribution([readBook(undefined), readBook([])])).toEqual([]);
    });
  });

  // ── computeProjections — extended ─────────────────────────────────────
  describe('computeProjections — extended', () => {
    it('skips books where remaining pages = 0', () => {
      const done = { id: 'b1', title: 'Done', totalPages: 100, currentPage: 100 };
      expect(computeProjections([done], 10)).toEqual([]);
    });

    it('caps output at 3 items', () => {
      const books = Array.from({ length: 5 }, (_, i) => ({
        id: `b${i}`, title: `Book${i}`, totalPages: 200, currentPage: i * 10,
      }));
      expect(computeProjections(books, 10)).toHaveLength(3);
    });

    it('finishDate is after today', () => {
      const [p] = computeProjections(
        [{ id: 'b1', title: 'A', totalPages: 100, currentPage: 0 }],
        10,
      );
      expect(p.finishDate > new Date()).toBe(true);
    });
  });

  // ── computeLibrarySnapshot — extended ─────────────────────────────────
  describe('computeLibrarySnapshot — extended', () => {
    it('wantToRead = WANT_TO_READ + WISH_LIST', () => {
      const books = [
        { status: BOOK_STATUS.WANT_TO_READ },
        { status: BOOK_STATUS.WISH_LIST },
      ];
      expect(computeLibrarySnapshot(books).wantToRead).toBe(2);
    });

    it('total matches books.length regardless of status', () => {
      const books = [
        { status: BOOK_STATUS.READING },
        { status: BOOK_STATUS.READ },
        { status: BOOK_STATUS.BOUGHT },
      ];
      expect(computeLibrarySnapshot(books).total).toBe(3);
    });
  });

  // ── computeAverageSpeed — extended ────────────────────────────────────
  describe('computeAverageSpeed — extended', () => {
    it('ignores sessions under 60 s', () => {
      const logs = [
        { pagesRead: 10, timeSeconds: 30 },  // too short → excluded
        { pagesRead: 60, timeSeconds: 3600 }, // valid: 60/h
      ];
      expect(computeAverageSpeed(logs)).toBe(60);
    });

    it('ignores sessions with 0 pages', () => {
      const logs = [
        { pagesRead: 0, timeSeconds: 3600 },
        { pagesRead: 60, timeSeconds: 3600 },
      ];
      expect(computeAverageSpeed(logs)).toBe(60);
    });
  });

  // ── computeSessionMetrics — extended ──────────────────────────────────
  describe('computeSessionMetrics — extended', () => {
    it('ignores sessions with timeSeconds = 0', () => {
      const logs = [{ pagesRead: 5, timeSeconds: 0 }];
      expect(computeSessionMetrics(logs).totalSessions).toBe(0);
    });

    it('all four fields correct for two sessions', () => {
      const logs = [{ timeSeconds: 1800 }, { timeSeconds: 3600 }];
      const m = computeSessionMetrics(logs);
      expect(m.totalSessions).toBe(2);
      expect(m.totalTimeSeconds).toBe(5400);
      expect(m.avgDuration).toBe(2700);
      expect(m.maxDuration).toBe(3600);
    });
  });

  // ── formatDuration — extended ─────────────────────────────────────────
  describe('formatDuration — extended', () => {
    it.each([
      [0, '0min'],
      [null, '0min'],
      [30, '30s'],
      [60, '1min'],
      [3600, '1h'],
      [3660, '1h1min'],
    ])('%s → %s', (input, expected) => {
      expect(formatDuration(input)).toBe(expected);
    });
  });

  // ── formatNumber — extended ───────────────────────────────────────────
  describe('formatNumber — extended', () => {
    it.each([
      [null, '0'],
      [0, '0'],
      [999, '999'],
      [1000, '1K'],
      [1500, '1.5K'],
      [2000, '2K'],
    ])('%s → %s', (input, expected) => {
      expect(formatNumber(input)).toBe(expected);
    });
  });

  // ── formatDate ───────────────────────────────────────────────────────
  describe('formatDate', () => {
    it('returns a non-empty Portuguese date string', () => {
      const s = formatDate(new Date('2026-08-15T12:00:00'));
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    });

    it('includes the day number in the output', () => {
      const s = formatDate(new Date('2026-06-05T12:00:00'));
      expect(s).toMatch(/5/);
    });
  });
});
