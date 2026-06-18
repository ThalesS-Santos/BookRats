import { useState, useMemo, useCallback } from 'react';

import { ALL_BADGES } from '@constants/badges';

const PAGE_SIZE = 9;

const isSafeKey = key =>
  typeof key === 'string' &&
  key !== '__proto__' &&
  key !== 'constructor' &&
  key !== 'prototype';

/**
 * useBadgeWall — centralized derived state for the trophy wall (Fase 3, Etapa 14).
 *
 * Encapsulates the badge filter/pagination UI state plus the pure derivation of
 * `processedBadges`/`visibleBadges`/`totalUnlocked` from `userData`. Extracting it
 * here removes duplicated (and previously divergent) logic from ProfileScreen and
 * UserProfileScreen.
 *
 * @param {object} userData metrics object consumed by each badge's `check()`
 * @param {object} [options]
 * @param {object|null} [options.unlockedBadges] persisted unlock map keyed by
 *   badge id (`{ [id]: { dateUnlocked } }`). When provided (the current user),
 *   ordering uses real unlock timestamps; when omitted (other users, whose unlock
 *   dates aren't readable), ordering falls back to badge index as a stable proxy.
 */
export const useBadgeWall = (userData, options = {}) => {
  const { unlockedBadges = null } = options;

  const [badgeFilter, setBadgeFilter] = useState('all'); // 'all' | 'unlocked' | 'locked' | 'recent'
  const [badgeLimit, setBadgeLimit] = useState(PAGE_SIZE);

  const totalUnlocked = useMemo(
    () => ALL_BADGES.filter(badge => badge.check(userData)).length,
    [userData],
  );

  const processedBadges = useMemo(() => {
    const badgesWithStatus = ALL_BADGES.map((badge, index) => {
      const isUnlocked = badge.check(userData);

      let dateUnlocked = 0;
      if (unlockedBadges) {
        const bId = badge.id;
        const info = isSafeKey(bId)
          ? Object.prototype.hasOwnProperty.call(unlockedBadges, bId)
            ? unlockedBadges[bId]
            : undefined
          : undefined;
        dateUnlocked = info?.dateUnlocked
          ? new Date(info.dateUnlocked).getTime()
          : 0;
      } else {
        // No access to this user's unlock timestamps — use index as a stable
        // proxy so unlocked badges keep a deterministic order.
        dateUnlocked = isUnlocked ? index : 0;
      }

      return { ...badge, isUnlocked, dateUnlocked };
    });

    let filtered = badgesWithStatus;
    if (badgeFilter === 'unlocked') {
      filtered = badgesWithStatus.filter(b => b.isUnlocked);
    } else if (badgeFilter === 'locked') {
      filtered = badgesWithStatus.filter(b => !b.isUnlocked);
    } else if (badgeFilter === 'recent') {
      filtered = badgesWithStatus.filter(b => b.isUnlocked);
    }

    if (badgeFilter === 'all') {
      filtered.sort((a, b) => {
        if (a.isUnlocked && !b.isUnlocked) return -1;
        if (!a.isUnlocked && b.isUnlocked) return 1;
        if (a.isUnlocked && b.isUnlocked) {
          if (a.dateUnlocked > 0 && b.dateUnlocked > 0)
            return b.dateUnlocked - a.dateUnlocked;
          if (a.dateUnlocked > 0 && b.dateUnlocked === 0) return -1;
          if (a.dateUnlocked === 0 && b.dateUnlocked > 0) return 1;
          return 0;
        }
        return 0;
      });
    } else if (badgeFilter === 'recent' || badgeFilter === 'unlocked') {
      filtered.sort((a, b) => {
        if (a.dateUnlocked > 0 && b.dateUnlocked > 0)
          return b.dateUnlocked - a.dateUnlocked;
        if (a.dateUnlocked > 0) return -1;
        if (b.dateUnlocked > 0) return 1;
        return 0;
      });
    }

    return filtered;
  }, [badgeFilter, userData, unlockedBadges]);

  const visibleBadges = useMemo(
    () => processedBadges.slice(0, badgeLimit),
    [processedBadges, badgeLimit],
  );

  const selectFilter = useCallback(filter => {
    setBadgeFilter(filter);
    setBadgeLimit(PAGE_SIZE);
  }, []);

  const showMore = useCallback(
    () => setBadgeLimit(prev => prev + PAGE_SIZE),
    [],
  );

  const showLess = useCallback(
    () => setBadgeLimit(prev => Math.max(PAGE_SIZE, prev - PAGE_SIZE)),
    [],
  );

  return {
    badgeFilter,
    badgeLimit,
    totalUnlocked,
    processedBadges,
    visibleBadges,
    selectFilter,
    showMore,
    showLess,
  };
};
