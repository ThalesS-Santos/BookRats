import { processActivity } from '../../src/utils/streakEngine';

describe('Streak Engine (Item 2 - Etapa 3)', () => {
  const baseStreak = {
    currentCount: 0,
    longestCount: 0,
    lastActivityDate: null,
    type: 'DAILY_LOG',
  };

  test('Test 1: Consecutive days advancement', () => {
    // Day 1
    let result = processActivity(baseStreak, '2026-05-01');
    expect(result.streak.currentCount).toBe(1);
    expect(result.streak.lastActivityDate).toBe('2026-05-01');
    expect(result.incremented).toBe(true);
    expect(result.broken).toBe(false);

    // Day 2
    result = processActivity(result.streak, '2026-05-02');
    expect(result.streak.currentCount).toBe(2);
    expect(result.streak.lastActivityDate).toBe('2026-05-02');
    expect(result.incremented).toBe(true);

    // Day 3
    result = processActivity(result.streak, '2026-05-03');
    expect(result.streak.currentCount).toBe(3);
    expect(result.streak.longestCount).toBe(3);
  });

  test('Test 2: Multiple activities on the same day (Idempotency)', () => {
    const initial = {
      ...baseStreak,
      currentCount: 5,
      longestCount: 5,
      lastActivityDate: '2026-05-10',
    };

    const result = processActivity(initial, '2026-05-10');

    expect(result.streak.currentCount).toBe(5);
    expect(result.streak.lastActivityDate).toBe('2026-05-10');
    expect(result.incremented).toBe(false);
    expect(result.broken).toBe(false);
  });

  test('Test 3: Streak broken by an inactive gap', () => {
    const initial = {
      ...baseStreak,
      currentCount: 10,
      longestCount: 15,
      lastActivityDate: '2026-05-10',
    };

    // Jump to 2026-05-12 (Gap of 1 day: 11th)
    const result = processActivity(initial, '2026-05-12');

    expect(result.streak.currentCount).toBe(1);
    expect(result.streak.lastActivityDate).toBe('2026-05-12');
    expect(result.broken).toBe(true);
    expect(result.streak.longestCount).toBe(15); // Longest preserved
  });

  test('Test 4: Historical record breakage (longestCount update)', () => {
    const initial = {
      ...baseStreak,
      currentCount: 5,
      longestCount: 5,
      lastActivityDate: '2026-05-10',
    };

    const result = processActivity(initial, '2026-05-11');

    expect(result.streak.currentCount).toBe(6);
    expect(result.streak.longestCount).toBe(6);
  });

  test('Boundary: Leap year check', () => {
    const feb28 = {
      ...baseStreak,
      currentCount: 1,
      lastActivityDate: '2024-02-28',
    };

    const result = processActivity(feb28, '2024-02-29');

    expect(result.streak.currentCount).toBe(2);
    expect(result.streak.lastActivityDate).toBe('2024-02-29');
    expect(result.broken).toBe(false);
  });
});
