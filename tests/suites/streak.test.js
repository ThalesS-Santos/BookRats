import {
  calculateStreak,
  calculateStreakFromLogs,
  getLocalDateString,
} from '@utils/streak';

describe('Streak Calculation Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Scenario 1 (Increment): should increment streak if last read was yesterday', () => {
    const lastDate = '2026-04-15';
    const today = '2026-04-16'; // Passed explicitly as the function requires it
    const currentStreak = 5;

    const result = calculateStreak(lastDate, today, currentStreak);

    expect(result).toBe(6);
  });

  it('Scenario 2 (Persistence): should not increment streak if reading multiple times on the same day', () => {
    const lastDate = '2026-04-16'; // Already read today
    const today = '2026-04-16';
    const currentStreak = 5;

    const result = calculateStreak(lastDate, today, currentStreak);

    expect(result).toBe(5);
  });

  it('Scenario 3 (Reset): should reset streak to 1 if there is a gap of 2 or more days', () => {
    const lastDate = '2026-04-14'; // 2 days ago
    const today = '2026-04-16';
    const currentStreak = 5;

    const result = calculateStreak(lastDate, today, currentStreak);

    expect(result).toBe(1);
  });

  describe('Scenario 4 (Transitions):', () => {
    it('should handle transition from February to March correctly', () => {
      jest.setSystemTime(new Date('2026-03-01'));
      const lastDate = '2026-02-28';
      const today = '2026-03-01';
      const currentStreak = 10;

      const result = calculateStreak(lastDate, today, currentStreak);

      expect(result).toBe(11);
    });

    it('should handle transition from December to January correctly', () => {
      jest.setSystemTime(new Date('2027-01-01'));
      const lastDate = '2026-12-31';
      const today = '2027-01-01';
      const currentStreak = 20;

      const result = calculateStreak(lastDate, today, currentStreak);

      expect(result).toBe(21);
    });
  });

  it('Scenario 5 (Safety): should return 1 when lastDate is null, undefined, or empty', () => {
    const today = '2026-04-16';
    const currentStreak = 5;

    expect(calculateStreak(null, today, currentStreak)).toBe(1);
    expect(calculateStreak(undefined, today, currentStreak)).toBe(1);
    expect(calculateStreak('', today, currentStreak)).toBe(1);
  });

  describe('calculateStreakFromLogs', () => {
    it('should return 0 when logs is null or empty', () => {
      expect(calculateStreakFromLogs(null)).toBe(0);
      expect(calculateStreakFromLogs([])).toBe(0);
    });

    it('should return 0 when the latest log is neither today nor yesterday', () => {
      const logs = [{ date: '2026-04-10' }, { date: '2026-04-09' }];
      expect(calculateStreakFromLogs(logs)).toBe(0);
    });

    it('should calculate streak starting from today', () => {
      // System time is set to 2026-04-16
      const logs = [
        { date: '2026-04-16' },
        { date: '2026-04-15' },
        { date: '2026-04-14' },
        { date: '2026-04-12' }, // Gap here
      ];
      expect(calculateStreakFromLogs(logs)).toBe(3);
    });

    it('should calculate streak starting from yesterday', () => {
      const logs = [
        { date: '2026-04-15' },
        { date: '2026-04-14' },
        { date: '2026-04-13' },
      ];
      expect(calculateStreakFromLogs(logs)).toBe(3);
    });

    it('should handle unsorted logs with duplicates', () => {
      const logs = [
        { date: '2026-04-14' },
        { date: '2026-04-16' },
        { date: '2026-04-15' },
        { date: '2026-04-15' }, // Duplicate
      ];
      expect(calculateStreakFromLogs(logs)).toBe(3);
    });
  });

  describe('getLocalDateString', () => {
    it('should return correct string for a given date', () => {
      const date = new Date('2026-05-20T12:00:00');
      expect(getLocalDateString(date)).toBe('2026-05-20');
    });

    it('should use current date when no date is provided', () => {
      expect(getLocalDateString()).toBe('2026-04-16');
    });
  });
});
