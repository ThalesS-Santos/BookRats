export const calculateStreak = (lastDateStr, newDateStr, currentStreak) => {
  if (!lastDateStr) return 1;
  
  // Normaliza ambas as datas para o início do dia em UTC para evitar problemas de fuso horário
  const lastDate = new Date(lastDateStr);
  lastDate.setUTCHours(0, 0, 0, 0);
  
  const newDate = new Date(newDateStr);
  newDate.setUTCHours(0, 0, 0, 0);

  const diffTime = newDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return currentStreak + 1;
  if (diffDays === 0) return currentStreak;
  return 1;
};
