/**
 * Calcula o streak atual baseado em uma lista de logs de leitura.
 * @param {Array<{date: string}>} logs - Lista de logs com campo date (YYYY-MM-DD)
 * @returns {number}
 */
export const calculateStreakFromLogs = (logs) => {
  if (!logs || logs.length === 0) return 0;

  // Extrai datas únicas e as ordena de forma decrescente
  const uniqueDates = [...new Set(logs.map(log => log.date))].sort((a, b) => b.localeCompare(a));
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Se não leu nem hoje nem ontem, o streak quebrou
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 0;
  let currentDate = new Date(uniqueDates[0]);

  for (const dateStr of uniqueDates) {
    const logDate = new Date(dateStr);
    
    // Verifica se a data do log é a data esperada para continuar o streak
    const diffTime = currentDate.getTime() - logDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      if (diffDays === 1) streak++;
      currentDate = logDate;
    } else {
      break;
    }
  }

  // O primeiro dia conta se for hoje ou ontem
  return streak + 1;
};

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
