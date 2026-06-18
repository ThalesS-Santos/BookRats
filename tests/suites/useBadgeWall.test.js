import { renderHook, act } from '@testing-library/react-native';

import { useBadgeWall } from '@ui/hooks/useBadgeWall';

// Deterministic badge set so ordering/filtering assertions are stable.
jest.mock('@constants/badges', () => ({
  ALL_BADGES: [
    {
      id: 'b_pages_100',
      title: '100 páginas',
      icon: 'layers',
      mission: 'Leia 100 páginas',
      check: u => (u.totalPagesRead || 0) >= 100,
    },
    {
      id: 'b_streak_3',
      title: 'Streak 3',
      icon: 'flame',
      mission: 'Mantenha 3 dias',
      check: u => (u.streak || 0) >= 3,
    },
    {
      id: 'b_books_1',
      title: 'Primeiro livro',
      icon: 'book',
      mission: 'Termine 1 livro',
      check: u => (u.completedBooks || 0) >= 1,
    },
    {
      id: 'b_pages_500',
      title: '500 páginas',
      icon: 'flash',
      mission: 'Leia 500 páginas',
      check: u => (u.totalPagesRead || 0) >= 500,
    },
  ],
}));

// userData that unlocks exactly b_pages_100 and b_books_1 (2 of 4).
const userData = {
  totalPagesRead: 120,
  streak: 0,
  completedBooks: 2,
};

describe('useBadgeWall', () => {
  it('counts only unlocked badges in totalUnlocked', () => {
    const { result } = renderHook(() => useBadgeWall(userData));
    expect(result.current.totalUnlocked).toBe(2);
  });

  it('defaults to "all" filter with a 9-item page and unlocked-first ordering', () => {
    const { result } = renderHook(() => useBadgeWall(userData));
    expect(result.current.badgeFilter).toBe('all');
    expect(result.current.badgeLimit).toBe(9);

    const ids = result.current.processedBadges.map(b => b.id);
    // Unlocked badges sort ahead of locked ones.
    const unlockedIds = result.current.processedBadges
      .filter(b => b.isUnlocked)
      .map(b => b.id);
    expect(unlockedIds).toEqual(['b_books_1', 'b_pages_100']); // index desc among unlocked
    expect(ids.slice(0, 2)).toEqual(unlockedIds);
    expect(ids).toHaveLength(4);
  });

  it('filters to only unlocked badges when filter is "unlocked"', () => {
    const { result } = renderHook(() => useBadgeWall(userData));
    act(() => result.current.selectFilter('unlocked'));
    expect(result.current.processedBadges.every(b => b.isUnlocked)).toBe(true);
    expect(result.current.processedBadges).toHaveLength(2);
  });

  it('filters to only locked badges when filter is "locked"', () => {
    const { result } = renderHook(() => useBadgeWall(userData));
    act(() => result.current.selectFilter('locked'));
    expect(result.current.processedBadges.every(b => !b.isUnlocked)).toBe(true);
    expect(result.current.processedBadges).toHaveLength(2);
  });

  it('selectFilter resets the page limit back to 9', () => {
    const { result } = renderHook(() => useBadgeWall(userData));
    act(() => result.current.showMore());
    expect(result.current.badgeLimit).toBe(18);
    act(() => result.current.selectFilter('locked'));
    expect(result.current.badgeLimit).toBe(9);
  });

  it('showMore/showLess page the limit and clamp at 9', () => {
    const { result } = renderHook(() => useBadgeWall(userData));
    act(() => result.current.showMore());
    expect(result.current.badgeLimit).toBe(18);
    act(() => result.current.showLess());
    expect(result.current.badgeLimit).toBe(9);
    act(() => result.current.showLess());
    expect(result.current.badgeLimit).toBe(9); // clamped
  });

  it('visibleBadges respects the current limit', () => {
    const { result } = renderHook(() => useBadgeWall(userData));
    expect(result.current.visibleBadges).toHaveLength(4); // all fit under 9
  });

  it('uses persisted unlock dates for ordering when unlockedBadges is provided', () => {
    const unlockedBadges = {
      b_pages_100: { dateUnlocked: '2026-01-01T00:00:00.000Z' },
      b_books_1: { dateUnlocked: '2026-06-01T00:00:00.000Z' }, // more recent
    };
    const { result } = renderHook(() =>
      useBadgeWall(userData, { unlockedBadges }),
    );
    act(() => result.current.selectFilter('recent'));
    // Most recently unlocked first.
    expect(result.current.processedBadges.map(b => b.id)).toEqual([
      'b_books_1',
      'b_pages_100',
    ]);
  });
});
