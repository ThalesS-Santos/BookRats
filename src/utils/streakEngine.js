import { getLocalDateString } from './streak';

/**
 * @typedef {Object} StreakState
 * @property {number} currentCount - Current consecutive days
 * @property {number} longestCount - Historical record
 * @property {string|null} lastActivityDate - YYYY-MM-DD string
 * @property {string} type - Activity type identifier (e.g. DAILY_LOG)
 */

/**
 * @typedef {Object} StreakActionResponse
 * @property {StreakState} streak - The updated streak state
 * @property {boolean} broken - Whether the previous streak was broken
 * @property {boolean} incremented - Whether the streak count was increased
 */

/**
 * Processes a new activity and calculates the updated streak state.
 * Strictly uses YYYY-MM-DD strings for timezone-agnostic comparisons.
 * 
 * @param {StreakState} currentStreakState 
 * @param {string} activityDate - The date of the activity in YYYY-MM-DD format
 * @returns {StreakActionResponse}
 */
export const processActivity = (currentStreakState, activityDate) => {
  const { currentCount, longestCount, lastActivityDate, type } = currentStreakState;

  // 1. Idempotency Check: Same day activity
  if (lastActivityDate === activityDate) {
    return {
      streak: { ...currentStreakState },
      broken: false,
      incremented: false
    };
  }

  // 2. Handle First Activity
  if (!lastActivityDate) {
    return {
      streak: {
        currentCount: 1,
        longestCount: Math.max(longestCount, 1),
        lastActivityDate: activityDate,
        type
      },
      broken: false,
      incremented: true
    };
  }

  // 3. Consecutive Day Check
  // Calculate "yesterday" relative to the new activityDate
  const current = new Date(`${activityDate}T12:00:00`);
  const yesterday = new Date(current);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (lastActivityDate === yesterdayStr) {
    const newCount = currentCount + 1;
    return {
      streak: {
        currentCount: newCount,
        longestCount: Math.max(longestCount, newCount),
        lastActivityDate: activityDate,
        type
      },
      broken: false,
      incremented: true
    };
  }

  // 4. Auto-Break / Reset: Gap detected
  return {
    streak: {
      currentCount: 1,
      longestCount: Math.max(longestCount, 1),
      lastActivityDate: activityDate,
      type
    },
    broken: true,
    incremented: true
  };
};
