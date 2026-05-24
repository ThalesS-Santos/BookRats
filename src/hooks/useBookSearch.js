import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { debounce } from '@utils/debounce';

import { searchBooks } from '@core/api/googleBooks';

/**
 * Custom hook for debounced book searching with advanced filters.
 */
export const useBookSearch = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    author: '',
    subjects: [],
    printType: 'all',
    orderBy: 'relevance',
  });
  const [results, setResults] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performSearch = useCallback(async (searchQuery, currentFilters) => {
    const trimmedQuery = searchQuery.trim();
    const hasAuthor = currentFilters.author.trim().length > 0;
    const hasSubjects =
      currentFilters.subjects && currentFilters.subjects.length > 0;

    if (!trimmedQuery && !hasAuthor && !hasSubjects) {
      setResults([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let items = [];
      let totalItemsCount = 0;

      if (currentFilters.subjects && currentFilters.subjects.length > 1) {
        // Simulating OR by making concurrent calls for each subject
        const promises = currentFilters.subjects.map(s =>
          searchBooks({
            generalQuery: trimmedQuery,
            author: currentFilters.author,
            subjects: [s],
            printType: currentFilters.printType,
            orderBy: currentFilters.orderBy,
          }),
        );

        const responses = await Promise.all(promises);

        // Merge and Deduplicate by ID
        const mergedItems = responses.flatMap(r => r.items || []);
        const seenIds = new Set();
        items = mergedItems.filter(item => {
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        totalItemsCount = items.length;
      } else {
        const data = await searchBooks({
          generalQuery: trimmedQuery,
          author: currentFilters.author,
          subjects: currentFilters.subjects,
          printType: currentFilters.printType,
          orderBy: currentFilters.orderBy,
        });
        items = data.items;
        totalItemsCount = data.totalItems;
      }

      setResults(items);
      setTotalItems(totalItemsCount);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar livros. Tente novamente.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((q, f) => performSearch(q, f), 800),
    [performSearch],
  );

  useEffect(() => {
    if (
      query.trim().length > 2 ||
      filters.author.trim().length > 2 ||
      filters.subjects.length > 0
    ) {
      debouncedSearch(query, filters);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTotalItems(0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      debouncedSearch.cancel();
    }

    return () => debouncedSearch.cancel();
  }, [query, filters, debouncedSearch]);

  const updateFilters = newFilters => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearSearch = () => {
    setQuery('');
    setFilters({
      author: '',
      subjects: [],
      printType: 'all',
      orderBy: 'relevance',
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
    clearSearch,
  };
};
