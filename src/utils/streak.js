export const calculateStreak = (lastDateStr, newDateStr, currentStreak) => {
  if (!lastDateStr) return 1;
  const lastDate = new Date(lastDateStr);
  const newDate = new Date(newDateStr);

  const diffTime = Math.abs(newDate.setHours(0, 0, 0, 0) - lastDate.setHours(0, 0, 0, 0));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return currentStreak + 1;
  if (diffDays === 0) return currentStreak;
  return 1;
};
