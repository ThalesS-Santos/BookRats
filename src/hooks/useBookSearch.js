import { useState, useEffect, useRef } from 'react';
import { searchBooks } from '@core/api/googleBooks';
import { debounce } from '@utils/debounce';

/**
 * Custom hook for debounced book searching using Google Books API.
 * 
 * @returns {Object} Search state and control functions.
 */
export const useBookSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // We use a ref to store the debounced function to ensure it's stable across renders
  // and can be properly cancelled on cleanup.
  const debouncedSearch = useRef(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotalItems(0);
        setLoading(false);
        return;
      }

      try {
        const data = await searchBooks({ generalQuery: searchQuery });
        setResults(data.items);
        setTotalItems(data.totalItems);
        setError(null);
      } catch (err) {
        setError('Erro ao buscar livros. Tente novamente.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    if (query.trim().length > 2) {
      setLoading(true); // Immediate UI feedback while debounce is waiting
      debouncedSearch(query);
    } else {
      setResults([]);
      setTotalItems(0);
      setLoading(false);
      debouncedSearch.cancel();
    }

    // Cleanup: Cancel pending search if component unmounts or query changes rapidly
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    totalItems,
    loading,
    error,
    clearSearch: () => {
      setQuery('');
      setResults([]);
      setTotalItems(0);
    }
  };
};
