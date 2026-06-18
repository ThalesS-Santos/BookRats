import { renderHook } from '@testing-library/react-native';

import { useHomeLogic } from '@ui/hooks/useHomeLogic';

// useHomeLogic subscribes to the REAL useMainStore on purpose here — that's what
// exercises the actual selector wiring. Firebase/AsyncStorage are already mocked
// globally in jest.setup.js, so importing the store is safe.

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('@core/services/BookService', () => ({
  BookService: {
    getRecentAnnotations: jest.fn(() => Promise.resolve([])),
  },
}));

describe('useHomeLogic — store subscription stability (regression)', () => {
  // 🛡️ Guards the infinite-loop class of bug: nesting a fresh-object selector
  // (e.g. selectCountsByStatus) inside a single useShallow object breaks the
  // shallow comparison, producing a new snapshot every render → "getSnapshot
  // should be cached" → Maximum update depth exceeded. If that regresses, this
  // hook throws on mount and the test fails.
  it('mounts without an infinite render loop', () => {
    const { result } = renderHook(() => useHomeLogic());
    expect(result.current).toBeDefined();
    expect(result.current.counts).toBeDefined();
  });

  it('keeps the counts reference stable across re-renders when the store is unchanged', () => {
    const { result, rerender } = renderHook(() => useHomeLogic());
    const firstCounts = result.current.counts;
    rerender();
    // A fresh object each render (the bug) would fail this identity check.
    expect(result.current.counts).toBe(firstCounts);
  });

  it('exposes a counts map keyed by status plus the shopping bucket', () => {
    const { result } = renderHook(() => useHomeLogic());
    expect(result.current.counts).toHaveProperty('lendo');
    expect(result.current.counts).toHaveProperty('quero_ler');
    expect(result.current.counts).toHaveProperty('lido');
    expect(result.current.counts).toHaveProperty('shopping');
  });
});
