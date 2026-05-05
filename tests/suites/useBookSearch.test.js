import { renderHook, act } from '@testing-library/react-native';
import { useBookSearch } from '@hooks/useBookSearch';
import { searchBooks } from '@core/api/googleBooks';

// Mock searchBooks
jest.mock('@core/api/googleBooks', () => ({
  searchBooks: jest.fn()
}));

describe('useBookSearch hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useBookSearch());
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should trigger debounced search when query length > 2', async () => {
    searchBooks.mockResolvedValue({ items: [{ id: '1', title: 'React Native' }], totalItems: 1 });
    
    const { result } = renderHook(() => useBookSearch());

    await act(async () => {
      result.current.setQuery('React');
    });

    // Should show loading immediately
    expect(result.current.loading).toBe(true);

    // Wait for debounce (500ms + buffer)
    await act(async () => {
      await new Promise(r => setTimeout(r, 600));
    });

    expect(searchBooks).toHaveBeenCalledWith({ generalQuery: 'React' });
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('React Native');
    expect(result.current.loading).toBe(false);
  });

  it('should clear results and cancel search when query is too short', async () => {
    const { result } = renderHook(() => useBookSearch());

    await act(async () => {
      result.current.setQuery('Re');
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it('should handle search errors gracefully', async () => {
    searchBooks.mockRejectedValue(new Error('Network Error'));
    
    const { result } = renderHook(() => useBookSearch());

    await act(async () => {
      result.current.setQuery('ErrorTest');
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 600));
    });

    expect(result.current.error).toBe('Erro ao buscar livros. Tente novamente.');
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should handle clearSearch function', async () => {
    const { result } = renderHook(() => useBookSearch());

    await act(async () => {
      result.current.setQuery('Some Query');
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
  });

  it('should handle empty or whitespace query in debounced function', async () => {
    searchBooks.mockResolvedValue({ items: [], totalItems: 0 });
    const { result } = renderHook(() => useBookSearch());

    await act(async () => {
      // Set a query that passes the length check but is mostly whitespace
      result.current.setQuery('   '); 
    });

    // In the hook implementation, query.trim().length > 2 check would fail for '   '
    expect(result.current.loading).toBe(false);
  });
});
