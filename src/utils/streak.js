/**
 * Get current date string in local timezone (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Update current streak based on last reading date.
 * Handles timezone issues by using local date strings.
 * 
 * @param {string} lastDateStr - Last reading date in YYYY-MM-DD format
 * @param {number} currentStreak - Current streak count
 * @returns {number} New streak count
 */
export const updateStreak = (lastDateStr, currentStreak, todayOverride = null) => {
  const todayStr = todayOverride || getLocalDateString();
  
  if (!lastDateStr) return 1;
  if (lastDateStr === todayStr) return currentStreak || 1;

  // Calculate yesterday in local time
  const todayDate = todayOverride ? new Date(todayOverride + 'T12:00:00') : new Date();
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (lastDateStr === yesterdayStr) {
    return (currentStreak || 0) + 1;
  }

  // If it wasn't yesterday and isn't today, streak resets to 1 (since the user is reading NOW)
  return 1;
};

/**
 * Legacy: Calculate streak from a list of logs.
 * @param {Array<{date: string}>} logs 
 */
export const calculateStreakFromLogs = (logs) => {
  if (!logs || logs.length === 0) return 0;
  const uniqueDates = [...new Set(logs.map(log => log.date))].sort((a, b) => b.localeCompare(a));
  
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i+1]);
    const diff = (current - next) / (1000 * 60 * 60 * 24);
    
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
};

// Keep calculateStreak for backward compatibility if needed, but point to updateStreak logic
export const calculateStreak = (lastDateStr, newDateStr, currentStreak) => {
  return updateStreak(lastDateStr, currentStreak, newDateStr);
};
