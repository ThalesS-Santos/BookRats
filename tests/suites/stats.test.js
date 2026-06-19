/**
 * src/utils/stats.js — Comprehensive unit tests
 *
 * Coverage target: every exported function, every branch, edge-cases first.
 *
 * Clock is pinned to 2026-06-18 (Thursday) for all date-sensitive functions
 * so the tests stay deterministic regardless of when they run.
 */

import { BOOK_STATUS } from '@core/constants/bookStatus';
import {
  GENRE_ALIAS_MAP,
  aggregatePagesByMonth,
  calculateReadingSpeed,
  comparePeriods,
  computeAbandonmentRate,
  computeConsistencyScore,
  computeEMA,
  computeGenreDiversity,
  computeGenreEvolution,
  computeGoalProgress,
  computeReadingDepth,
  computeSMA,
  computeStreakStats,
  computeZScores,
  detectAllStreaks,
  detectOutlierSessions,
  fitLinearTrend,
  forecastPagesNextN,
  fuzzyNormalizeGenre,
  getMostReadGenresNormalized,
  levenshtein,
  mean,
  memoizeStats,
  normalizeGenre,
  stddev,
} from '@utils/stats';

// ── clock fixture ─────────────────────────────────────────────────────────────
// 2026-06-18 noon UTC = Thursday (getDay()=4)
const FIXED = new Date('2026-06-18T12:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED);
});

afterAll(() => jest.useRealTimers());

// ── fixtures ──────────────────────────────────────────────────────────────────

const LOG = (date, pagesRead, timeSeconds = 1800) => ({
  date,
  pagesRead,
  timeSeconds,
  pagesPerHour: Math.round((pagesRead / timeSeconds) * 3600),
});

const BOOK = (status, categories = [], totalPages = 300, currentPage = 0, finishDate = null) => ({
  id: `b-${Math.random()}`,
  title: 'Test Book',
  status,
  categories,
  totalPages,
  currentPage,
  finishDate,
});

// ── 1. GENRE_ALIAS_MAP ────────────────────────────────────────────────────────
describe('GENRE_ALIAS_MAP', () => {
  it('is a non-empty object', () => {
    expect(typeof GENRE_ALIAS_MAP).toBe('object');
    expect(Object.keys(GENRE_ALIAS_MAP).length).toBeGreaterThan(10);
  });

  it('all keys are lowercase', () => {
    Object.keys(GENRE_ALIAS_MAP).forEach(k =>
      expect(k).toBe(k.toLowerCase()),
    );
  });

  it('all values are title-cased strings (not empty)', () => {
    Object.values(GENRE_ALIAS_MAP).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });
});

// ── 2. normalizeGenre ─────────────────────────────────────────────────────────
describe('normalizeGenre', () => {
  it('maps exact alias (lowercase)', () => {
    expect(normalizeGenre('sci-fi')).toBe('Science Fiction');
  });

  it('is case-insensitive', () => {
    expect(normalizeGenre('Sci-Fi')).toBe('Science Fiction');
    expect(normalizeGenre('SCI-FI')).toBe('Science Fiction');
  });

  it('trims surrounding whitespace before alias lookup', () => {
    // 'fantasia' is in the alias map → 'Fantasy'
    expect(normalizeGenre('  fantasia  ')).toBe('Fantasy');
  });

  it('trims surrounding whitespace for non-alias values', () => {
    // 'fantasy' is not an alias key — trimmed raw value is returned as-is
    expect(normalizeGenre('  fantasy  ')).toBe('fantasy');
  });

  it('maps PT-BR variants', () => {
    expect(normalizeGenre('fantasia')).toBe('Fantasy');
    expect(normalizeGenre('autoajuda')).toBe('Self-Help');
    expect(normalizeGenre('terror')).toBe('Horror');
  });

  it('returns cleaned original when no alias found', () => {
    expect(normalizeGenre('  Obscure Niche  ')).toBe('Obscure Niche');
  });

  it('returns empty string for null/undefined/non-string', () => {
    expect(normalizeGenre(null)).toBe('');
    expect(normalizeGenre(undefined)).toBe('');
    expect(normalizeGenre(42)).toBe('');
  });
});

// ── 3. levenshtein ────────────────────────────────────────────────────────────
describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('fantasy', 'fantasy')).toBe(0);
  });

  it('returns string length when one string is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('classic kitten → sitting = 3', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('single character difference = 1', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
  });

  it('handles transpositions correctly', () => {
    expect(levenshtein('ab', 'ba')).toBe(2); // Levenshtein, not Damerau
  });

  it('empty-to-empty = 0', () => {
    expect(levenshtein('', '')).toBe(0);
  });
});

// ── 4. fuzzyNormalizeGenre ────────────────────────────────────────────────────
describe('fuzzyNormalizeGenre', () => {
  it('delegates to alias map for exact matches first', () => {
    expect(fuzzyNormalizeGenre('sci-fi')).toBe('Science Fiction');
    expect(fuzzyNormalizeGenre('fantasia')).toBe('Fantasy');
  });

  it('corrects a one-character typo ("Fantsy" → "Fantasy")', () => {
    // distance('fantsy', 'fantasy') = 1 — within default threshold of 3
    expect(fuzzyNormalizeGenre('Fantsy')).toBe('Fantasy');
  });

  it('corrects a two-character typo', () => {
    // "Fantssy" → "Fantasy"
    expect(fuzzyNormalizeGenre('Fantssy')).toBe('Fantasy');
  });

  it('returns the cleaned raw value when distance exceeds threshold', () => {
    // Something completely unrelated
    const result = fuzzyNormalizeGenre('XYZRandomGenre123', 3);
    expect(result).toBe('XYZRandomGenre123');
  });

  it('handles empty string', () => {
    expect(fuzzyNormalizeGenre('')).toBe('');
  });

  it('handles null', () => {
    expect(fuzzyNormalizeGenre(null)).toBe('');
  });
});

// ── 5. mean ───────────────────────────────────────────────────────────────────
describe('mean', () => {
  it('returns 0 for empty array', () => expect(mean([])).toBe(0));
  it('single element = that element', () => expect(mean([7])).toBe(7));
  it('[1,2,3] → 2', () => expect(mean([1, 2, 3])).toBe(2));
  it('[0,0,0] → 0', () => expect(mean([0, 0, 0])).toBe(0));
  it('handles floats', () => expect(mean([1, 2])).toBe(1.5));
});

// ── 6. stddev ─────────────────────────────────────────────────────────────────
describe('stddev', () => {
  it('returns 0 for empty array', () => expect(stddev([])).toBe(0));
  it('returns 0 for single element', () => expect(stddev([5])).toBe(0));
  it('returns 0 when all values are equal', () => expect(stddev([4, 4, 4])).toBe(0));
  it('[2,4,4,4,5,5,7,9] → population stddev ≈ 2', () => {
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 0);
  });
});

// ── 7. computeSMA ─────────────────────────────────────────────────────────────
describe('computeSMA', () => {
  it('returns empty for empty input', () => {
    expect(computeSMA([])).toEqual([]);
  });

  it('window=1 is identity', () => {
    expect(computeSMA([3, 5, 7], 1)).toEqual([3, 5, 7]);
  });

  it('window=3 on [1,2,3,4,5]', () => {
    const result = computeSMA([1, 2, 3, 4, 5], 3);
    expect(result[0]).toBeCloseTo(1);       // only 1 element
    expect(result[1]).toBeCloseTo(1.5);     // 2 elements
    expect(result[2]).toBeCloseTo(2);       // [1,2,3]
    expect(result[4]).toBeCloseTo(4);       // [3,4,5]
  });

  it('output length equals input length', () => {
    expect(computeSMA([10, 20, 30, 40], 2)).toHaveLength(4);
  });
});

// ── 8. computeEMA ─────────────────────────────────────────────────────────────
describe('computeEMA', () => {
  it('returns empty for empty input', () => expect(computeEMA([])).toEqual([]));

  it('single element returns that element', () => {
    expect(computeEMA([10])).toEqual([10]);
  });

  it('all-same values → constant EMA', () => {
    const result = computeEMA([5, 5, 5, 5]);
    result.forEach(v => expect(v).toBeCloseTo(5));
  });

  it('EMA approaches step-function target', () => {
    // Start at 0, spike to 100 — EMA should increase
    const result = computeEMA([0, 0, 0, 100, 100, 100], 0.5);
    expect(result[5]).toBeGreaterThan(result[0]);
  });

  it('alpha=1 is identity (each value equals itself)', () => {
    const vals = [1, 4, 9, 16];
    expect(computeEMA(vals, 1)).toEqual(vals);
  });
});

// ── 9. fitLinearTrend ─────────────────────────────────────────────────────────
describe('fitLinearTrend', () => {
  it('returns slope=0 and momentum=stable for single element', () => {
    const r = fitLinearTrend([5]);
    expect(r.slope).toBe(0);
    expect(r.momentum).toBe('stable');
  });

  it('perfect ascending line → slope ≈ 1, R²=1, momentum=increasing', () => {
    const r = fitLinearTrend([1, 2, 3, 4, 5]);
    expect(r.slope).toBeCloseTo(1);
    expect(r.r2).toBeCloseTo(1);
    expect(r.momentum).toBe('increasing');
  });

  it('perfect descending line → negative slope, momentum=declining', () => {
    const r = fitLinearTrend([5, 4, 3, 2, 1]);
    expect(r.slope).toBeCloseTo(-1);
    expect(r.momentum).toBe('declining');
  });

  it('flat series → slope ≈ 0, momentum=stable, R²=1', () => {
    const r = fitLinearTrend([4, 4, 4, 4]);
    expect(r.slope).toBeCloseTo(0);
    expect(r.r2).toBeCloseTo(1);
    expect(r.momentum).toBe('stable');
  });

  it('R² is between 0 and 1 for noisy data', () => {
    const r = fitLinearTrend([1, 10, 2, 9, 3, 8]);
    expect(r.r2).toBeGreaterThanOrEqual(0);
    expect(r.r2).toBeLessThanOrEqual(1);
  });

  it('returns object with slope, intercept, r2, momentum', () => {
    const r = fitLinearTrend([1, 2, 3]);
    expect(r).toHaveProperty('slope');
    expect(r).toHaveProperty('intercept');
    expect(r).toHaveProperty('r2');
    expect(r).toHaveProperty('momentum');
  });
});

// ── 10. detectAllStreaks ──────────────────────────────────────────────────────
describe('detectAllStreaks', () => {
  it('returns empty array for no logs', () => {
    expect(detectAllStreaks([])).toEqual([]);
  });

  it('single day = one streak of length 1', () => {
    const result = detectAllStreaks([LOG('2026-06-10', 10)]);
    expect(result).toHaveLength(1);
    expect(result[0].length).toBe(1);
    expect(result[0].start).toBe('2026-06-10');
    expect(result[0].end).toBe('2026-06-10');
  });

  it('three consecutive days = one streak of length 3', () => {
    const logs = [
      LOG('2026-06-10', 10),
      LOG('2026-06-11', 20),
      LOG('2026-06-12', 30),
    ];
    const result = detectAllStreaks(logs);
    expect(result).toHaveLength(1);
    expect(result[0].length).toBe(3);
  });

  it('detects a gap and produces two separate streaks', () => {
    const logs = [
      LOG('2026-06-10', 10),
      LOG('2026-06-11', 20),
      // gap: June 12 skipped
      LOG('2026-06-13', 30),
      LOG('2026-06-14', 40),
    ];
    const result = detectAllStreaks(logs);
    expect(result).toHaveLength(2);
    expect(result[0].length).toBe(2);
    expect(result[1].length).toBe(2);
  });

  it('multiple logs on the same day count as one active day', () => {
    const logs = [
      LOG('2026-06-10', 10),
      LOG('2026-06-10', 15), // same day
      LOG('2026-06-11', 20),
    ];
    const result = detectAllStreaks(logs);
    expect(result).toHaveLength(1);
    expect(result[0].length).toBe(2);
  });

  it('streaks are returned oldest-first', () => {
    const logs = [
      LOG('2026-06-01', 5),
      LOG('2026-06-10', 5),
      LOG('2026-06-11', 5),
    ];
    const result = detectAllStreaks(logs);
    expect(result[0].start).toBe('2026-06-01');
    expect(result[1].start).toBe('2026-06-10');
  });
});

// ── 11. computeStreakStats ────────────────────────────────────────────────────
describe('computeStreakStats', () => {
  it('returns zeros for empty log history', () => {
    const s = computeStreakStats([]);
    expect(s.longest).toBe(0);
    expect(s.average).toBe(0);
    expect(s.total).toBe(0);
    expect(s.streaks).toEqual([]);
  });

  it('calculates longest, average, and total streaks', () => {
    const logs = [
      // streak 1: 3 days
      LOG('2026-06-01', 10), LOG('2026-06-02', 10), LOG('2026-06-03', 10),
      // gap
      // streak 2: 1 day
      LOG('2026-06-10', 10),
    ];
    const s = computeStreakStats(logs);
    expect(s.total).toBe(2);
    expect(s.longest).toBe(3);
    expect(s.average).toBe(2); // (3+1)/2
  });
});

// ── 12. computeConsistencyScore ───────────────────────────────────────────────
describe('computeConsistencyScore', () => {
  it('returns 0 for empty logs', () => {
    expect(computeConsistencyScore([], 7)).toBe(0);
  });

  it('returns 0 when days=0', () => {
    expect(computeConsistencyScore([LOG('2026-06-18', 10)], 0)).toBe(0);
  });

  it('returns 100 when every day in the window has a log', () => {
    // FIXED = June 18; create 7 consecutive logs ending today
    const logs = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(FIXED);
      d.setDate(FIXED.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return LOG(key, 10);
    });
    expect(computeConsistencyScore(logs, 7)).toBe(100);
  });

  it('returns ~50 when user reads every other day', () => {
    const logs = [
      LOG('2026-06-18', 10),
      LOG('2026-06-16', 10),
      LOG('2026-06-14', 10),
      LOG('2026-06-12', 10),
    ];
    const score = computeConsistencyScore(logs, 8);
    expect(score).toBe(50);
  });

  it('ignores logs outside the window', () => {
    const logs = [LOG('2020-01-01', 999)]; // far in the past
    expect(computeConsistencyScore(logs, 7)).toBe(0);
  });
});

// ── 13. computeGenreDiversity ─────────────────────────────────────────────────
describe('computeGenreDiversity', () => {
  it('returns null when no READ books', () => {
    expect(computeGenreDiversity([])).toBeNull();
    expect(
      computeGenreDiversity([BOOK(BOOK_STATUS.READING, ['Fiction'])]),
    ).toBeNull();
  });

  it('returns 0 when all books share a single genre', () => {
    const books = [
      BOOK(BOOK_STATUS.READ, ['Fantasy']),
      BOOK(BOOK_STATUS.READ, ['Fantasy']),
    ];
    expect(computeGenreDiversity(books)).toBe(0);
  });

  it('returns a value in (0, 1] for diverse reading', () => {
    const books = [
      BOOK(BOOK_STATUS.READ, ['Fantasy']),
      BOOK(BOOK_STATUS.READ, ['Science Fiction']),
      BOOK(BOOK_STATUS.READ, ['Romance']),
      BOOK(BOOK_STATUS.READ, ['Horror']),
    ];
    const d = computeGenreDiversity(books);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(1);
  });

  it('returns ~1.0 for perfectly equal genre distribution', () => {
    // Each genre appears exactly once → maximum entropy
    const genres = ['Fantasy', 'Romance', 'Horror', 'Mystery & Thriller'];
    const books = genres.map(g => BOOK(BOOK_STATUS.READ, [g]));
    expect(computeGenreDiversity(books)).toBeCloseTo(1.0, 1);
  });
});

// ── 14. computeZScores ───────────────────────────────────────────────────────
describe('computeZScores', () => {
  it('all-same values → all zeros', () => {
    expect(computeZScores([5, 5, 5])).toEqual([0, 0, 0]);
  });

  it('standard normal-ish distribution has z in expected range', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const zScores = computeZScores(values);
    // Mean ≈ 5; stddev ≈ 2
    expect(zScores[0]).toBeCloseTo(-1.5, 0); // value=2 is below mean
    expect(zScores[7]).toBeCloseTo(2, 0);    // value=9 is above mean
  });

  it('output length equals input length', () => {
    expect(computeZScores([1, 2, 3, 100])).toHaveLength(4);
  });
});

// ── 15. detectOutlierSessions ────────────────────────────────────────────────
describe('detectOutlierSessions', () => {
  it('returns empty for fewer than 3 sessions', () => {
    expect(detectOutlierSessions([LOG('2026-06-01', 10)])).toEqual([]);
    expect(detectOutlierSessions([])).toEqual([]);
  });

  it('returns empty when all sessions are similar', () => {
    const logs = [
      LOG('2026-06-01', 10), LOG('2026-06-02', 11), LOG('2026-06-03', 10),
      LOG('2026-06-04', 10), LOG('2026-06-05', 9),
    ];
    expect(detectOutlierSessions(logs, 2.5)).toEqual([]);
  });

  it('flags an extreme session as an outlier', () => {
    const logs = [
      LOG('2026-06-01', 10), LOG('2026-06-02', 10), LOG('2026-06-03', 10),
      LOG('2026-06-04', 10), LOG('2026-06-05', 10),
      LOG('2026-06-06', 10), LOG('2026-06-07', 10),
      LOG('2026-06-08', 10), LOG('2026-06-09', 500), // extreme outlier
    ];
    const outliers = detectOutlierSessions(logs, 2.0);
    expect(outliers.length).toBeGreaterThan(0);
    expect(outliers[0].pagesRead).toBe(500);
    expect(outliers[0].zScore).toBeDefined();
  });

  it('attaches zScore to returned sessions', () => {
    const logs = Array.from({ length: 8 }, (_, i) =>
      LOG(`2026-06-0${i + 1}`, i === 7 ? 1000 : 10),
    );
    const outliers = detectOutlierSessions(logs, 2.0);
    if (outliers.length > 0) {
      expect(typeof outliers[0].zScore).toBe('number');
    }
  });
});

// ── 16. comparePeriods ───────────────────────────────────────────────────────
describe('comparePeriods', () => {
  it('returns flat when no logs', () => {
    const r = comparePeriods([], 7);
    expect(r.currentPages).toBe(0);
    expect(r.previousPages).toBe(0);
    expect(r.trend).toBe('flat');
  });

  it('detects upward trend when current > previous', () => {
    // Current period: last 7 days; today = June 18 → window June 12–18
    const logs = [
      LOG('2026-06-17', 100), // current period
      LOG('2026-06-15', 20),  // current period
      // previous period = June 5–11
      LOG('2026-06-08', 10),
    ];
    const r = comparePeriods(logs, 7);
    expect(r.trend).toBe('up');
    expect(r.delta).toBeGreaterThan(0);
  });

  it('detects downward trend when current < previous', () => {
    const logs = [
      LOG('2026-06-08', 200), // previous period
      LOG('2026-06-17', 10),  // current period (less)
    ];
    const r = comparePeriods(logs, 7);
    expect(r.trend).toBe('down');
    expect(r.delta).toBeLessThan(0);
  });

  it('deltaPercent is 100 when previous=0 and current>0', () => {
    const logs = [LOG('2026-06-17', 50)];
    const r = comparePeriods(logs, 7);
    expect(r.previousPages).toBe(0);
    expect(r.deltaPercent).toBe(100);
  });

  it('result has all expected keys', () => {
    const r = comparePeriods([], 7);
    expect(r).toHaveProperty('currentPages');
    expect(r).toHaveProperty('previousPages');
    expect(r).toHaveProperty('delta');
    expect(r).toHaveProperty('deltaPercent');
    expect(r).toHaveProperty('trend');
  });
});

// ── 17. forecastPagesNextN ───────────────────────────────────────────────────
describe('forecastPagesNextN', () => {
  it('returns nDays entries all zero when no logs', () => {
    const result = forecastPagesNextN([], 5);
    expect(result).toHaveLength(5);
    result.forEach(r => expect(r.predicted).toBe(0));
  });

  it('returns exactly nDays entries', () => {
    const logs = [LOG('2026-06-18', 30), LOG('2026-06-17', 40)];
    expect(forecastPagesNextN(logs, 3)).toHaveLength(3);
  });

  it('predicted > 0 when recent daily average is > 0', () => {
    const logs = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(FIXED);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return LOG(key, 20);
    });
    const result = forecastPagesNextN(logs, 3);
    result.forEach(r => expect(r.predicted).toBeGreaterThan(0));
  });

  it('each entry has daysFromNow starting at 1', () => {
    const result = forecastPagesNextN([], 3);
    expect(result[0].daysFromNow).toBe(1);
    expect(result[2].daysFromNow).toBe(3);
  });
});

// ── 18. computeGoalProgress ──────────────────────────────────────────────────
describe('computeGoalProgress', () => {
  it('returns null for yearlyGoal=0', () => {
    expect(computeGoalProgress(0, 5)).toBeNull();
  });

  it('returns null for negative goal', () => {
    expect(computeGoalProgress(-1, 5)).toBeNull();
  });

  it('reports onPace=true when ahead of expected pace', () => {
    // June 18 is day ~169 of 2026 (≈46% of year)
    // Goal=24; expected ≈ 11; completed=15 → onPace
    const r = computeGoalProgress(24, 15, FIXED);
    expect(r.onPace).toBe(true);
    expect(r.surplus).toBeGreaterThan(0);
    expect(r.deficit).toBe(0);
  });

  it('reports onPace=false when behind expected pace', () => {
    // Goal=52 (one/week); expected ≈ 24 after ~169 days; completed=3
    const r = computeGoalProgress(52, 3, FIXED);
    expect(r.onPace).toBe(false);
    expect(r.deficit).toBeGreaterThan(0);
    expect(r.surplus).toBe(0);
  });

  it('percentComplete is 100 when books=goal', () => {
    const r = computeGoalProgress(12, 12, FIXED);
    expect(r.percentComplete).toBe(100);
  });

  it('projectedYearEnd is reasonable (> 0)', () => {
    const r = computeGoalProgress(12, 6, FIXED);
    expect(r.projectedYearEnd).toBeGreaterThan(0);
  });

  it('returns all expected keys', () => {
    const r = computeGoalProgress(12, 6, FIXED);
    ['yearlyGoal','completedBooks','expectedAtPace','onPace',
      'deficit','surplus','projectedYearEnd','percentComplete','dayOfYear',
    ].forEach(k => expect(r).toHaveProperty(k));
  });
});

// ── 19. computeAbandonmentRate ───────────────────────────────────────────────
describe('computeAbandonmentRate', () => {
  it('returns 0 for empty library', () => {
    expect(computeAbandonmentRate([])).toBe(0);
  });

  it('returns 0 when no books have been started', () => {
    const books = [BOOK(BOOK_STATUS.WANT_TO_READ), BOOK(BOOK_STATUS.WISH_LIST)];
    expect(computeAbandonmentRate(books)).toBe(0);
  });

  it('returns 0 when no books are dropped', () => {
    const books = [BOOK(BOOK_STATUS.READING), BOOK(BOOK_STATUS.READ)];
    expect(computeAbandonmentRate(books)).toBe(0);
  });

  it('calculates rate correctly: 2 dropped out of 5 started = 0.4', () => {
    const books = [
      BOOK(BOOK_STATUS.READ),
      BOOK(BOOK_STATUS.READ),
      BOOK(BOOK_STATUS.READING),
      BOOK(BOOK_STATUS.DROPPED),
      BOOK(BOOK_STATUS.DROPPED),
    ];
    expect(computeAbandonmentRate(books)).toBeCloseTo(0.4);
  });

  it('ignores WANT_TO_READ and WISH_LIST in denominator', () => {
    const books = [
      BOOK(BOOK_STATUS.DROPPED),
      BOOK(BOOK_STATUS.WANT_TO_READ), // not "started"
    ];
    // 1 dropped / 1 started = 1.0
    expect(computeAbandonmentRate(books)).toBe(1);
  });
});

// ── 20. computeReadingDepth ──────────────────────────────────────────────────
describe('computeReadingDepth', () => {
  it('returns all zeros when no relevant books', () => {
    const r = computeReadingDepth([BOOK(BOOK_STATUS.WANT_TO_READ, [], 400)]);
    expect(r).toEqual({ avgPages: 0, maxPages: 0, minPages: 0 });
  });

  it('returns zeros when totalPages=0', () => {
    const r = computeReadingDepth([BOOK(BOOK_STATUS.READ, [], 0)]);
    expect(r).toEqual({ avgPages: 0, maxPages: 0, minPages: 0 });
  });

  it('correctly computes avg, max, min for read books', () => {
    const books = [
      BOOK(BOOK_STATUS.READ, [], 100),
      BOOK(BOOK_STATUS.READ, [], 300),
      BOOK(BOOK_STATUS.READING, [], 200),
    ];
    const r = computeReadingDepth(books);
    expect(r.avgPages).toBe(200);
    expect(r.maxPages).toBe(300);
    expect(r.minPages).toBe(100);
  });

  it('includes READING books in the calculation', () => {
    const books = [BOOK(BOOK_STATUS.READING, [], 500)];
    const r = computeReadingDepth(books);
    expect(r.avgPages).toBe(500);
  });
});

// ── 21. computeGenreEvolution ────────────────────────────────────────────────
describe('computeGenreEvolution', () => {
  it('returns empty array when no READ books', () => {
    expect(computeGenreEvolution([])).toEqual([]);
  });

  it('returns empty when no books have a finishDate', () => {
    const books = [BOOK(BOOK_STATUS.READ, ['Fantasy'], 300, 300, null)];
    expect(computeGenreEvolution(books)).toEqual([]);
  });

  it('places recent books in recent bucket and older ones in older bucket', () => {
    // recent = last 6 months (Jan–Jun 2026); older = Jul–Dec 2025
    const recentBook = BOOK(BOOK_STATUS.READ, ['Fantasy'], 300, 300, '2026-05-01');
    const olderBook  = BOOK(BOOK_STATUS.READ, ['Horror'],  300, 300, '2025-10-01');

    const evolution = computeGenreEvolution([recentBook, olderBook], 6);
    const fantasy = evolution.find(e => e.genre === 'Fantasy');
    const horror  = evolution.find(e => e.genre === 'Horror');

    expect(fantasy?.recent).toBe(1);
    expect(fantasy?.older).toBe(0);
    expect(horror?.recent).toBe(0);
    expect(horror?.older).toBe(1);
  });

  it('computes delta = recent - older', () => {
    const recentBook = BOOK(BOOK_STATUS.READ, ['Fiction'], 300, 300, '2026-05-01');
    const olderBook  = BOOK(BOOK_STATUS.READ, ['Fiction'], 300, 300, '2025-10-01');
    const evolution = computeGenreEvolution([recentBook, olderBook], 6);
    const fiction = evolution.find(e => e.genre === 'Fiction');
    expect(fiction?.delta).toBe(0); // 1 recent - 1 older = 0
  });
});

// ── 22. getMostReadGenresNormalized ──────────────────────────────────────────
describe('getMostReadGenresNormalized', () => {
  it('returns empty for empty library', () => {
    expect(getMostReadGenresNormalized([])).toEqual([]);
  });

  it('ignores non-READ books', () => {
    const books = [BOOK(BOOK_STATUS.READING, ['Fantasy'])];
    expect(getMostReadGenresNormalized(books)).toEqual([]);
  });

  it('merges fuzzy-matched genre variants into one bucket', () => {
    const books = [
      BOOK(BOOK_STATUS.READ, ['sci-fi']),   // → Science Fiction
      BOOK(BOOK_STATUS.READ, ['Sci-Fi']),   // → Science Fiction (same)
      BOOK(BOOK_STATUS.READ, ['Fantasy']),
    ];
    const result = getMostReadGenresNormalized(books);
    const sf = result.find(r => r.genre === 'Science Fiction');
    expect(sf?.count).toBe(2); // both entries merged
  });

  it('limits output to `limit` entries', () => {
    const books = Array.from({ length: 10 }, (_, i) =>
      BOOK(BOOK_STATUS.READ, [`UniqueGenre${i}`]),
    );
    expect(getMostReadGenresNormalized(books, 5)).toHaveLength(5);
  });

  it('sorts by count descending', () => {
    const books = [
      BOOK(BOOK_STATUS.READ, ['Romance']),
      BOOK(BOOK_STATUS.READ, ['Fantasy']),
      BOOK(BOOK_STATUS.READ, ['Fantasy']),
    ];
    const result = getMostReadGenresNormalized(books);
    expect(result[0].genre).toBe('Fantasy');
    expect(result[0].count).toBe(2);
  });
});

// ── 23. calculateReadingSpeed ────────────────────────────────────────────────
describe('calculateReadingSpeed', () => {
  it('returns 0 for empty sessions', () => {
    expect(calculateReadingSpeed([])).toBe(0);
  });

  it('returns 0 when all sessions are too short (<60s)', () => {
    expect(calculateReadingSpeed([{ pagesRead: 10, timeSeconds: 30 }])).toBe(0);
  });

  it('returns 0 for sessions with 0 pages', () => {
    expect(calculateReadingSpeed([{ pagesRead: 0, timeSeconds: 3600 }])).toBe(0);
  });

  it('60 pages in 1 hour = 60 pág/h', () => {
    expect(calculateReadingSpeed([{ pagesRead: 60, timeSeconds: 3600 }])).toBe(60);
  });

  it('averages across multiple valid sessions', () => {
    const sessions = [
      { pagesRead: 30, timeSeconds: 1800 }, // 60/h
      { pagesRead: 60, timeSeconds: 1800 }, // 120/h
    ];
    // total: 90 pages / 1 hour = 90/h
    expect(calculateReadingSpeed(sessions)).toBe(90);
  });

  it('ignores short sessions when averaging', () => {
    const sessions = [
      { pagesRead: 10, timeSeconds: 30 },   // too short
      { pagesRead: 60, timeSeconds: 3600 }, // valid → 60/h
    ];
    expect(calculateReadingSpeed(sessions)).toBe(60);
  });
});

// ── 24. aggregatePagesByMonth ────────────────────────────────────────────────
describe('aggregatePagesByMonth', () => {
  it('returns empty object for no sessions', () => {
    expect(aggregatePagesByMonth([])).toEqual({});
  });

  it('correctly maps January logs to "Jan"', () => {
    const sessions = [{ date: '2026-01-15', pagesRead: 50 }];
    expect(aggregatePagesByMonth(sessions)).toEqual({ Jan: 50 });
  });

  it('sums multiple sessions in the same month', () => {
    const sessions = [
      { date: '2026-06-10', pagesRead: 30 },
      { date: '2026-06-18', pagesRead: 20 },
    ];
    expect(aggregatePagesByMonth(sessions)).toEqual({ Jun: 50 });
  });

  it('separates sessions across different months', () => {
    const sessions = [
      { date: '2026-05-01', pagesRead: 40 },
      { date: '2026-06-01', pagesRead: 60 },
    ];
    const result = aggregatePagesByMonth(sessions);
    expect(result.Mai).toBe(40);
    expect(result.Jun).toBe(60);
  });

  it('uses PT-BR month abbreviations', () => {
    const months = [
      ['2026-01-01', 'Jan'], ['2026-02-01', 'Fev'], ['2026-03-01', 'Mar'],
      ['2026-04-01', 'Abr'], ['2026-05-01', 'Mai'], ['2026-06-01', 'Jun'],
      ['2026-07-01', 'Jul'], ['2026-08-01', 'Ago'], ['2026-09-01', 'Set'],
      ['2026-10-01', 'Out'], ['2026-11-01', 'Nov'], ['2026-12-01', 'Dez'],
    ];
    const sessions = months.map(([date]) => ({ date, pagesRead: 1 }));
    const result = aggregatePagesByMonth(sessions);
    months.forEach(([, abbr]) => expect(result[abbr]).toBe(1));
  });
});

// ── 25. memoizeStats ────────────────────────────────────────────────────────
describe('memoizeStats', () => {
  it('calls the underlying function on first invocation', () => {
    const fn = jest.fn(x => x * 2);
    const memoized = memoizeStats(fn);
    expect(memoized(5)).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns cached result on repeated call with same args', () => {
    const fn = jest.fn(x => x * 2);
    const memoized = memoizeStats(fn);
    memoized(5);
    memoized(5);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recomputes when args change', () => {
    const fn = jest.fn(x => x * 2);
    const memoized = memoizeStats(fn);
    memoized(5);
    memoized(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses length + first + last as cache key for array args', () => {
    const fn = jest.fn(arr => arr.reduce((s, v) => s + v, 0));
    const memoized = memoizeStats(fn);
    memoized([1, 2, 3]);
    memoized([1, 2, 3]); // same key
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exposes a .cache Map that can be manually cleared', () => {
    const fn = jest.fn(() => 42);
    const memoized = memoizeStats(fn);
    memoized('a');
    expect(memoized.cache.size).toBe(1);
    memoized.cache.clear();
    expect(memoized.cache.size).toBe(0);
    memoized('a'); // recomputes after clear
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
