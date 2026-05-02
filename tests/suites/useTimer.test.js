import { renderHook, act } from '@testing-library/react-native';
import { useTimer } from '../../src/hooks/useTimer';

describe('useTimer Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start timer initially if isActiveInitially is true', () => {
    const { result } = renderHook(() => useTimer(true));

    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.seconds).toBe(3);
  });

  it('should not start timer initially if isActiveInitially is false', () => {
    const { result } = renderHook(() => useTimer(false));

    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(0);
  });

  it('should toggle isActive', () => {
    const { result } = renderHook(() => useTimer(false));

    act(() => {
      result.current.setIsActive(true);
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(1);

    act(() => {
      result.current.setIsActive(false);
    });

    expect(result.current.isActive).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(1);
  });

  it('should reset timer', () => {
    const { result } = renderHook(() => useTimer(true));

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.seconds).toBe(5);

    act(() => {
      result.current.resetTimer();
    });

    expect(result.current.seconds).toBe(0);
  });

  it('should allow manually setting seconds', () => {
    const { result } = renderHook(() => useTimer(false));

    act(() => {
      result.current.setSeconds(100);
    });

    expect(result.current.seconds).toBe(100);
  });

  it('should clear interval on unmount', () => {
    const { unmount } = renderHook(() => useTimer(true));
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
