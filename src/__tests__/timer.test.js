import { renderHook, act } from '@testing-library/react-native';
import { useTimer } from '../hooks/useTimer';
import { formatTime } from '../utils/time';

describe('Timer Logic & Hook', () => {
  describe('formatTime utility', () => {
    it('Scenario 1: should format 0 seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    it('Scenario 1: should format 59 seconds correctly', () => {
      expect(formatTime(59)).toBe('00:59');
    });

    it('Scenario 1: should roll over 60 seconds to minutes (01:00)', () => {
      expect(formatTime(60)).toBe('01:00');
    });

    it('Scenario 1: should roll over 3600 seconds to hours (1:00:00)', () => {
      expect(formatTime(3600)).toBe('1:00:00');
    });

    it('should handle large amounts of time (10:05:30)', () => {
      expect(formatTime(36330)).toBe('10:05:30');
    });

    it('should return 00:00 for negative values', () => {
      expect(formatTime(-10)).toBe('00:00');
    });
  });

  describe('useTimer hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('Scenario 2 (Start): should start incrementing after start', () => {
      const { result } = renderHook(() => useTimer(false)); // Start inactive
      
      expect(result.current.isActive).toBe(false);
      expect(result.current.seconds).toBe(0);

      act(() => {
        result.current.setIsActive(true);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.seconds).toBe(3);
    });

    it('Scenario 2 (Pause): should stop incrementing when paused', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.seconds).toBe(2);

      act(() => {
        result.current.setIsActive(false);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.seconds).toBe(2); // Stays at 2
    });

    it('Scenario 2 (Reset): should return to zero and clear interval', () => {
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

    it('Scenario 3 (Background Resilience): should resume from exact second stopped', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(result.current.seconds).toBe(10);

      act(() => {
        result.current.setIsActive(false);
      });
      
      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds pass while paused
      });
      expect(result.current.seconds).toBe(10);

      act(() => {
        result.current.setIsActive(true);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      expect(result.current.seconds).toBe(12); // 10 + 2
    });

    it('Clean Up: should clear interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { unmount } = renderHook(() => useTimer(true));

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
