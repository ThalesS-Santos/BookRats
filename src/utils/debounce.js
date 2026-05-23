/**
 * Cria uma função debounced que adia a execução da função fornecida até que
 * tenham decorrido 'wait' milissegundos desde a última chamada.
 *
 * @param {Function} func - A função a ser debounced.
 * @param {number} wait - O tempo de espera em milissegundos.
 * @returns {Function} - A função debounced com método .cancel().
 */
export const debounce = (func, wait) => {
  let timeout;

  const debounced = (...args) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return debounced;
};
