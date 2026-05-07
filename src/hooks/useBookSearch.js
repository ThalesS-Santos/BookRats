import { useState, useEffect, useRef, useCallback } from 'react';
import { searchBooks } from '@core/api/googleBooks';
import { debounce } from '@utils/debounce';

/**
 * Custom hook for debounced book searching with advanced filters.
 */
export const useBookSearch = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    author: '',
    subjects: [],
    printType: 'all',
    orderBy: 'relevance'
  });
  const [results, setResults] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performSearch = useCallback(async (searchQuery, currentFilters) => {
    const trimmedQuery = searchQuery.trim();
    const hasAuthor = currentFilters.author.trim().length > 0;
    
    if (!trimmedQuery && !hasAuthor) {
      setResults([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await searchBooks({ 
        generalQuery: trimmedQuery,
        author: currentFilters.author,
        subjects: currentFilters.subjects,
        printType: currentFilters.printType,
        orderBy: currentFilters.orderBy
      });
      setResults(data.items);
      setTotalItems(data.totalItems);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar livros. Tente novamente.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useRef(
    debounce((q, f) => performSearch(q, f), 800)
  ).current;

  useEffect(() => {
    if (query.trim().length > 2 || filters.author.trim().length > 2 || filters.subjects.length > 0) {
      debouncedSearch(query, filters);
    } else {
      setResults([]);
      setTotalItems(0);
      setLoading(false);
      debouncedSearch.cancel();
    }

    return () => debouncedSearch.cancel();
  }, [query, filters, debouncedSearch]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearSearch = () => {
    setQuery('');
    setFilters({
      author: '',
      subjects: [],
      printType: 'all',
      orderBy: 'relevance'
    });
    setResults([]);
    setTotalItems(0);
  };

  return {
    query,
    setQuery,
    filters,
    updateFilters,
    results,
    totalItems,
    loading,
    error,
    clearSearch
  };
};
