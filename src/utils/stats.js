/**
 * Advanced Reading Analytics
 *
 * A data-science layer on top of the basic aggregation in statsCompute.js.
 * Every export here is a pure function — no React, no store, no side-effects.
 *
 * What lives here (and NOT in statsCompute.js):
 *   • Genre normalization — fuzzy matching + Levenshtein + canonical map
 *   • Statistical primitives — mean, stddev, SMA, EMA
 *   • Linear regression — slope, intercept, R², momentum signal
 *   • Streak retrospective — find ALL historical streaks from log history
 *   • Consistency score — % of days active in a window
 *   • Shannon entropy — genre diversity index
 *   • Z-score outlier detection — flag anomalous sessions
 *   • Period comparison — delta / trend between consecutive periods
 *   • EMA-based forecasting — predicted pages for the next N days
 *   • Reading goal tracker — on-pace analysis against a yearly target
 *   • Library quality metrics — abandonment rate, reading depth
 *   • Genre evolution — which genres gained / lost share over time
 *   • Memoization factory — cheap cache layer for expensive computations
 */

import { BOOK_STATUS } from '@core/constants/bookStatus';

// ── helpers ──────────────────────────────────────────────────────────────────

function _dateKey(date) {
  const d = date instanceof Date ? date : new Date(date + 'T12:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── 1. Genre Normalization ────────────────────────────────────────────────────

/**
 * Maps common raw genre strings (PT-BR + EN variants, case-insensitive, trimmed)
 * to their canonical English label. Keeps the genre list clean and de-duplicated.
 */
export const GENRE_ALIAS_MAP = {
  // Science Fiction
  'sci-fi': 'Science Fiction',
  'scifi': 'Science Fiction',
  'science-fiction': 'Science Fiction',
  'sf': 'Science Fiction',
  'ficção científica': 'Science Fiction',
  'ficção cientifica': 'Science Fiction',
  'ciência ficção': 'Science Fiction',
  // Fantasy
  'fantasia': 'Fantasy',
  'high fantasy': 'Fantasy',
  'dark fantasy': 'Fantasy',
  'epic fantasy': 'Fantasy',
  // Mystery & Thriller
  'mystery': 'Mystery & Thriller',
  'thriller': 'Mystery & Thriller',
  'suspense': 'Mystery & Thriller',
  'crime': 'Mystery & Thriller',
  'crime fiction': 'Mystery & Thriller',
  'mistério': 'Mystery & Thriller',
  'misterio': 'Mystery & Thriller',
  // Romance
  'romantic': 'Romance',
  'love story': 'Romance',
  'romance fiction': 'Romance',
  // Non-Fiction
  'nonfiction': 'Non-Fiction',
  'non fiction': 'Non-Fiction',
  'não ficção': 'Non-Fiction',
  'nao ficcao': 'Non-Fiction',
  // Self-Help
  'self help': 'Self-Help',
  'self-improvement': 'Self-Help',
  'autoajuda': 'Self-Help',
  'auto ajuda': 'Self-Help',
  'auto-ajuda': 'Self-Help',
  'desenvolvimento pessoal': 'Self-Help',
  // Biography & Memoir
  'autobiography': 'Biography & Memoir',
  'memoir': 'Biography & Memoir',
  'memoirs': 'Biography & Memoir',
  'biografie': 'Biography & Memoir',
  'biografia': 'Biography & Memoir',
  'autobiografia': 'Biography & Memoir',
  'biography': 'Biography & Memoir',
  // History
  'história': 'History',
  'historia': 'History',
  'historical': 'History',
  'historical fiction': 'Historical Fiction',
  'ficção histórica': 'Historical Fiction',
  'ficção historica': 'Historical Fiction',
  // Horror
  'terror': 'Horror',
  // Young Adult
  'ya': 'Young Adult',
  'young-adult': 'Young Adult',
  'juvenil': 'Young Adult',
  // Children's
  "children's": "Children's",
  'kids': "Children's",
  'infantil': "Children's",
  'infanto-juvenil': "Children's",
  // Business & Economics
  'negócios': 'Business',
  'negocios': 'Business',
  'economia': 'Business & Economics',
  'economics': 'Business & Economics',
  // Psychology
  'psicologia': 'Psychology',
  // Philosophy
  'filosofia': 'Philosophy',
  // Adventure
  'aventura': 'Adventure',
  // Comics & Graphic Novel
  'comics': 'Graphic Novel & Comics',
  'graphic novel': 'Graphic Novel & Comics',
  'hq': 'Graphic Novel & Comics',
  'quadrinhos': 'Graphic Novel & Comics',
  // Literary Fiction
  'literatura': 'Literary Fiction',
  'literary': 'Literary Fiction',
  // Classics
  'classic': 'Classics',
  'classic literature': 'Classics',
  'clássicos': 'Classics',
  'classicos': 'Classics',
};

const _CANONICAL_GENRES = [...new Set(Object.values(GENRE_ALIAS_MAP))];

/**
 * Normalizes a genre string via the alias map.
 * Handles case, extra whitespace, and underscore separators.
 * Falls back to the trimmed original if no alias matches.
 */
export function normalizeGenre(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.trim();
  const key = cleaned.toLowerCase().replace(/\s+/g, ' ').replace(/_/g, '-');
  return GENRE_ALIAS_MAP[key] || cleaned;
}

/**
 * Classic dynamic-programming Levenshtein (edit) distance.
 * Runs in O(m·n) time and O(m·n) space — acceptable for short genre strings.
 */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Like normalizeGenre, but also tries fuzzy (Levenshtein) matching against
 * every canonical genre when the alias map has no exact entry.
 * Useful for catching user typos: "Sceince Fiction" → "Science Fiction".
 *
 * @param {string} raw
 * @param {number} threshold - max edit distance to accept a fuzzy match (default 3)
 */
export function fuzzyNormalizeGenre(raw, threshold = 3) {
  if (!raw) return '';
  const cleaned = raw.trim();
  const key = cleaned.toLowerCase().replace(/\s+/g, ' ').replace(/_/g, '-');

  if (GENRE_ALIAS_MAP[key]) return GENRE_ALIAS_MAP[key];

  const lower = cleaned.toLowerCase();
  let best = cleaned;
  let bestDist = Infinity;
  for (const canonical of _CANONICAL_GENRES) {
    const dist = levenshtein(lower, canonical.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = canonical;
    }
  }
  return bestDist <= threshold ? best : cleaned;
}

// ── 2. Statistical Primitives ─────────────────────────────────────────────────

/** Arithmetic mean. Returns 0 for empty arrays. */
export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Population standard deviation. Returns 0 for arrays with fewer than 2 elements. */
export function stddev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

/**
 * Simple Moving Average.
 * Each output[i] is the mean of the trailing `window` values ending at i.
 */
export function computeSMA(values, window = 7) {
  return values.map((_, i) =>
    mean(values.slice(Math.max(0, i - window + 1), i + 1)),
  );
}

/**
 * Exponential Moving Average.
 * alpha ∈ (0, 1]: higher alpha reacts faster to recent data.
 * Seed value is values[0].
 */
export function computeEMA(values, alpha = 0.3) {
  if (!values.length) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * Ordinary Least Squares linear regression over an implicit x = [0, 1, …, n-1].
 *
 * Returns:
 *   slope     — pages-per-day increase per calendar day
 *   intercept — predicted value at x = 0
 *   r2        — coefficient of determination (0 = no fit, 1 = perfect)
 *   momentum  — 'increasing' | 'stable' | 'declining'
 */
export function fitLinearTrend(values) {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, r2: 0, momentum: 'stable' };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n, r2: 1, momentum: 'stable' };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssTot = values.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = values.reduce((s, y, i) => s + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  const momentum =
    slope > 0.5 ? 'increasing' : slope < -0.5 ? 'declining' : 'stable';

  return {
    slope: Math.round(slope * 100) / 100,
    intercept: Math.round(intercept * 100) / 100,
    r2: Math.round(r2 * 1000) / 1000,
    momentum,
  };
}

// ── 3. Streak Retrospective ───────────────────────────────────────────────────

/**
 * Scans a full log history and returns an array of EVERY consecutive reading
 * streak found, from oldest to newest.
 *
 * Unlike streakEngine.js (which manages live streak state), this function
 * performs a retrospective analysis on already-stored logs.
 *
 * Returns: Array<{ start: string, end: string, length: number }>
 */
export function detectAllStreaks(logs) {
  if (!logs.length) return [];

  const dates = [...new Set(logs.map(l => l.date))].sort();
  if (!dates.length) return [];

  const streaks = [];
  let start = dates[0];
  let prev = dates[0];

  for (let i = 1; i < dates.length; i++) {
    const curr = dates[i];
    const gap =
      (new Date(curr + 'T12:00:00') - new Date(prev + 'T12:00:00')) /
      86_400_000;

    if (gap === 1) {
      prev = curr;
    } else {
      const len =
        Math.round(
          (new Date(prev + 'T12:00:00') - new Date(start + 'T12:00:00')) /
            86_400_000,
        ) + 1;
      streaks.push({ start, end: prev, length: len });
      start = curr;
      prev = curr;
    }
  }

  const len =
    Math.round(
      (new Date(prev + 'T12:00:00') - new Date(start + 'T12:00:00')) /
        86_400_000,
    ) + 1;
  streaks.push({ start, end: prev, length: len });

  return streaks;
}

/**
 * Summary statistics over all historical streaks.
 * Returns: { longest, average, total, streaks }
 */
export function computeStreakStats(logs) {
  const streaks = detectAllStreaks(logs);
  if (!streaks.length) {
    return { longest: 0, average: 0, total: 0, streaks: [] };
  }
  const lengths = streaks.map(s => s.length);
  return {
    longest: Math.max(...lengths),
    average: Math.round(mean(lengths) * 10) / 10,
    total: streaks.length,
    streaks,
  };
}

// ── 4. Consistency Score ──────────────────────────────────────────────────────

/**
 * Returns 0–100: the percentage of the last `days` days that had at least one
 * reading session. A score of 100 means the user read every single day;
 * 0 means no activity at all in the window.
 */
export function computeConsistencyScore(logs, days = 30) {
  if (!logs.length || days <= 0) return 0;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const windowSet = new Set(
    Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return _dateKey(d);
    }),
  );

  const activeDays = new Set(logs.map(l => l.date).filter(d => windowSet.has(d)));
  return Math.round((activeDays.size / days) * 100);
}

// ── 5. Genre Diversity (Shannon Entropy) ─────────────────────────────────────

/**
 * Measures how varied the user's reading tastes are, using Shannon entropy.
 *
 * Formula: H = -Σ p(x) · log₂(p(x)) — normalized by log₂(numGenres) to [0, 1].
 *
 * Returns:
 *   null if there are no genres to analyze
 *   0    if every book belongs to the same genre
 *   1    if books are spread perfectly equally across all genres
 */
export function computeGenreDiversity(books) {
  const counts = {};
  books
    .filter(b => b.status === BOOK_STATUS.READ)
    .forEach(b =>
      (b.categories || []).forEach(cat => {
        const g = fuzzyNormalizeGenre(cat);
        if (g) counts[g] = (counts[g] || 0) + 1;
      }),
    );

  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  if (total === 0) return null;

  const n = Object.keys(counts).length;
  if (n === 1) return 0;

  const H = Object.values(counts).reduce((s, c) => {
    const p = c / total;
    return s - p * Math.log2(p);
  }, 0);

  return Math.round((H / Math.log2(n)) * 100) / 100;
}

// ── 6. Outlier Detection (Z-score) ───────────────────────────────────────────

/** Returns a z-score for each value. All-same arrays → all zeros. */
export function computeZScores(values) {
  const m = mean(values);
  const sd = stddev(values);
  if (sd === 0) return values.map(() => 0);
  return values.map(v => Math.round(((v - m) / sd) * 100) / 100);
}

/**
 * Returns the subset of logs whose pagesRead z-score exceeds `threshold`.
 * Each returned log has an extra `zScore` field attached.
 * Requires at least 3 data points to produce meaningful outliers.
 */
export function detectOutlierSessions(logs, threshold = 2.5) {
  if (logs.length < 3) return [];
  const zScores = computeZScores(logs.map(l => l.pagesRead || 0));
  return logs
    .map((l, i) => ({ ...l, zScore: zScores[i] }))
    .filter(l => Math.abs(l.zScore) > threshold);
}

// ── 7. Period Comparison ──────────────────────────────────────────────────────

/**
 * Compares total pages in the CURRENT period vs the equivalent PRIOR period.
 *
 * Example with periodDays = 7:
 *   current  = last 7 days
 *   previous = the 7 days before that
 *
 * Returns: { currentPages, previousPages, delta, deltaPercent, trend }
 */
export function comparePeriods(logs, periodDays) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const currentStart = new Date(today);
  currentStart.setDate(today.getDate() - periodDays + 1);
  currentStart.setHours(0, 0, 0, 0);

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousEnd.getDate() - periodDays + 1);
  previousStart.setHours(0, 0, 0, 0);

  const inRange = (dateStr, start, end) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d >= start && d <= end;
  };

  const currentPages = logs
    .filter(l => inRange(l.date, currentStart, today))
    .reduce((s, l) => s + (l.pagesRead || 0), 0);

  const previousPages = logs
    .filter(l => inRange(l.date, previousStart, previousEnd))
    .reduce((s, l) => s + (l.pagesRead || 0), 0);

  const delta = currentPages - previousPages;
  const deltaPercent =
    previousPages === 0
      ? currentPages > 0 ? 100 : 0
      : Math.round((delta / previousPages) * 100);

  return {
    currentPages,
    previousPages,
    delta,
    deltaPercent,
    trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  };
}

// ── 8. EMA-based Forecasting ──────────────────────────────────────────────────

function _buildDailyPageMap(logs, lookbackDays) {
  const today = new Date();
  const map = {};
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map[_dateKey(d)] = 0;
  }
  logs.forEach(l => {
    if (l.date in map) map[l.date] += l.pagesRead || 0;
  });
  return map;
}

/**
 * Uses an Exponential Moving Average over the last `lookback` days to predict
 * how many pages the user is likely to read over the next `nDays` days.
 *
 * Returns: Array<{ daysFromNow: number, predicted: number }>
 *
 * Why EMA and not SMA?
 *   EMA gives more weight to recent sessions, adapting faster after a rest
 *   period or a reading burst than a simple window average would.
 */
export function forecastPagesNextN(logs, nDays = 7, lookback = 30, alpha = 0.3) {
  if (!logs.length) {
    return Array.from({ length: nDays }, (_, i) => ({
      daysFromNow: i + 1,
      predicted: 0,
    }));
  }

  const dailyMap = _buildDailyPageMap(logs, lookback);
  // Object.values() returns newest-first; reverse to get oldest-first for EMA
  const values = Object.values(dailyMap).reverse();
  const ema = computeEMA(values, alpha);
  const predicted = Math.max(0, Math.round(ema[ema.length - 1] ?? 0));

  return Array.from({ length: nDays }, (_, i) => ({
    daysFromNow: i + 1,
    predicted,
  }));
}

// ── 9. Reading Goal Tracker ───────────────────────────────────────────────────

/**
 * Determines whether the user is on pace to hit a yearly book-count goal.
 *
 * Returns:
 *   null if yearlyGoal ≤ 0
 *   Otherwise:
 *     { yearlyGoal, completedBooks, expectedAtPace, onPace,
 *       deficit, surplus, projectedYearEnd, percentComplete, dayOfYear }
 */
export function computeGoalProgress(yearlyGoal, completedBooks, todayDate = new Date()) {
  if (!yearlyGoal || yearlyGoal <= 0) return null;

  const startOfYear = new Date(todayDate.getFullYear(), 0, 1);
  const endOfYear = new Date(todayDate.getFullYear() + 1, 0, 1);
  const totalDays = (endOfYear - startOfYear) / 86_400_000;
  const dayOfYear = Math.max(1, Math.ceil((todayDate - startOfYear) / 86_400_000));

  const expectedAtPace = (dayOfYear / totalDays) * yearlyGoal;
  const onPace = completedBooks >= expectedAtPace;
  const deficit = Math.max(0, Math.ceil(expectedAtPace - completedBooks));
  const surplus = Math.max(0, completedBooks - Math.floor(expectedAtPace));
  const projectedYearEnd = Math.round((completedBooks / dayOfYear) * totalDays);

  return {
    yearlyGoal,
    completedBooks,
    expectedAtPace: Math.round(expectedAtPace * 10) / 10,
    onPace,
    deficit,
    surplus,
    projectedYearEnd,
    percentComplete: Math.round((completedBooks / yearlyGoal) * 100),
    dayOfYear,
  };
}

// ── 10. Library Quality Metrics ───────────────────────────────────────────────

/**
 * Abandonment rate = dropped / (reading + read + dropped).
 * Returns a value in [0, 1]. A rate above 0.3 is generally considered high.
 */
export function computeAbandonmentRate(books) {
  const started = books.filter(b =>
    [BOOK_STATUS.READING, BOOK_STATUS.READ, BOOK_STATUS.DROPPED].includes(b.status),
  ).length;
  if (started === 0) return 0;
  const dropped = books.filter(b => b.status === BOOK_STATUS.DROPPED).length;
  return Math.round((dropped / started) * 100) / 100;
}

/**
 * Characterizes the "weight" of the user's reading list.
 * Returns: { avgPages, maxPages, minPages }
 */
export function computeReadingDepth(books) {
  const relevant = books.filter(
    b =>
      [BOOK_STATUS.READ, BOOK_STATUS.READING].includes(b.status) &&
      b.totalPages > 0,
  );
  if (!relevant.length) return { avgPages: 0, maxPages: 0, minPages: 0 };
  const pages = relevant.map(b => b.totalPages);
  return {
    avgPages: Math.round(mean(pages)),
    maxPages: Math.max(...pages),
    minPages: Math.min(...pages),
  };
}

// ── 11. Genre Evolution ───────────────────────────────────────────────────────

/**
 * Compares genre frequencies between the last `periodMonths` months
 * (recent) and the equivalent window before that (older).
 *
 * Requires books to have a `finishDate: 'YYYY-MM-DD'` field.
 *
 * Returns: Array<{ genre, recent, older, delta }> sorted by recent count desc.
 */
export function computeGenreEvolution(books, periodMonths = 6) {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setMonth(today.getMonth() - periodMonths);
  const oldCutoff = new Date(cutoff);
  oldCutoff.setMonth(cutoff.getMonth() - periodMonths);

  const recent = {};
  const older = {};

  books
    .filter(b => b.status === BOOK_STATUS.READ && b.finishDate)
    .forEach(b => {
      const finished = new Date(b.finishDate + 'T12:00:00');
      if (finished < oldCutoff) return;
      const bucket = finished >= cutoff ? recent : older;
      (b.categories || []).forEach(cat => {
        const g = normalizeGenre(cat);
        if (g) bucket[g] = (bucket[g] || 0) + 1;
      });
    });

  const allGenres = new Set([...Object.keys(recent), ...Object.keys(older)]);
  return [...allGenres]
    .map(genre => ({
      genre,
      recent: recent[genre] || 0,
      older: older[genre] || 0,
      delta: (recent[genre] || 0) - (older[genre] || 0),
    }))
    .sort((a, b) => b.recent - a.recent);
}

// ── 12. Advanced Genre Analysis ───────────────────────────────────────────────

/**
 * Like statsCompute's computeGenreDistribution but applies full fuzzy
 * normalization, collapsing typos and regional variants into the same bucket.
 */
export function getMostReadGenresNormalized(books, limit = 7) {
  const counts = {};
  books
    .filter(b => b.status === BOOK_STATUS.READ)
    .forEach(b =>
      (b.categories || []).forEach(cat => {
        const g = fuzzyNormalizeGenre(cat);
        if (g) counts[g] = (counts[g] || 0) + 1;
      }),
    );

  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ── 13. Original Spec Helpers ─────────────────────────────────────────────────

/**
 * Calculates reading speed across an array of session objects.
 * A session must have { pagesRead: number, timeSeconds: number }.
 * Sessions shorter than 60 s are ignored as outliers (timer accidents).
 *
 * Returns pages-per-hour (number), or 0 if no valid sessions.
 */
export function calculateReadingSpeed(sessions) {
  const valid = (sessions || []).filter(
    s => s.pagesRead > 0 && s.timeSeconds > 60,
  );
  if (!valid.length) return 0;
  const totalPages = valid.reduce((s, v) => s + v.pagesRead, 0);
  const totalHours = valid.reduce((s, v) => s + v.timeSeconds / 3600, 0);
  return Math.round(totalPages / totalHours);
}

/**
 * Aggregates total pages read into a month-keyed object.
 * Sessions must have { date: 'YYYY-MM-DD', pagesRead: number }.
 *
 * Returns: { 'Jan': 120, 'Fev': 80, … } in PT-BR month abbreviations.
 */
export function aggregatePagesByMonth(sessions) {
  const MONTHS_PT = [
    'Jan','Fev','Mar','Abr','Mai','Jun',
    'Jul','Ago','Set','Out','Nov','Dez',
  ];
  const result = {};
  (sessions || []).forEach(s => {
    const d = new Date(s.date + 'T12:00:00');
    const key = MONTHS_PT[d.getMonth()];
    result[key] = (result[key] || 0) + (s.pagesRead || 0);
  });
  return result;
}

// ── 14. Memoization Factory ───────────────────────────────────────────────────

/**
 * Wraps an expensive stats function in a shallow cache.
 *
 * Cache key heuristic: serialises primitive args as-is; for arrays, encodes
 * [length, first item, last item] — fast to compute, catches the common
 * "same books array" scenario without a deep hash.
 *
 * The cache is NOT time-bounded; call cache.clear() if you need to
 * force a recomputation (e.g. after a store mutation).
 *
 * @param {Function} fn
 * @returns {{ fn: Function, cache: Map }}
 */
export function memoizeStats(fn) {
  const cache = new Map();

  function memoized(...args) {
    const key = JSON.stringify(
      args.map(arg =>
        Array.isArray(arg)
          ? { _len: arg.length, _first: arg[0], _last: arg[arg.length - 1] }
          : arg,
      ),
    );
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }

  memoized.cache = cache;
  return memoized;
}
