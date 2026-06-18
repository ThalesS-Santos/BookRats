import { MilestoneService } from '@core/services/MilestoneService';

describe('MilestoneService', () => {
  const baseCtx = {
    sessionSeconds: 0,
    sessionPages: 0,
    totalPagesRead: 0,
    totalBooksCompleted: 0,
    streak: 0,
  };

  describe('detect', () => {
    it('returns no messages when nothing is crossed', () => {
      const { messages, newlyAnnounced } = MilestoneService.detect(
        baseCtx,
        {},
        'Thales',
      );
      expect(messages).toEqual([]);
      expect(newlyAnnounced).toEqual([]);
    });

    it('announces only the highest tier of a group but marks all crossed tiers', () => {
      // A 2h session clears 30min, 1h and 2h at once.
      const { messages, newlyAnnounced } = MilestoneService.detect(
        { ...baseCtx, sessionSeconds: 7200 },
        {},
        'Thales',
      );

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('2 horas');
      // All three crossed tiers are recorded so the lower ones never re-fire.
      expect(newlyAnnounced).toEqual(
        expect.arrayContaining(['s_time_30', 's_time_60', 's_time_120']),
      );
    });

    it('does not re-announce already announced milestones', () => {
      const announced = { s_time_30: true, s_time_60: true, s_time_120: true };
      const { messages, newlyAnnounced } = MilestoneService.detect(
        { ...baseCtx, sessionSeconds: 7200 },
        announced,
        'Thales',
      );
      expect(messages).toEqual([]);
      expect(newlyAnnounced).toEqual([]);
    });

    it('can announce multiple distinct groups in one update', () => {
      const { messages } = MilestoneService.detect(
        { ...baseCtx, sessionPages: 100, totalBooksCompleted: 1, streak: 7 },
        {},
        'Thales',
      );
      // One message each for session_pages, books and streak groups.
      expect(messages).toHaveLength(3);
    });

    it('uses the provided user name in the message', () => {
      const { messages } = MilestoneService.detect(
        { ...baseCtx, totalBooksCompleted: 1 },
        {},
        'Maria',
      );
      expect(messages[0]).toContain('@Maria');
    });

    it('exposes exactly 15 milestones', () => {
      expect(MilestoneService.MILESTONES).toHaveLength(15);
    });
  });

  describe('buildProgressAnnouncements', () => {
    const result = {
      sessionSeconds: 300,
      pagesReadToday: 60, // crosses session_pages 50
      newTotalPagesRead: 160,
      newTotalBooksCompleted: 0,
      newStreak: 1,
      justCompleted: false,
    };

    it('returns milestone messages and an announced-map update when a landmark is reached', () => {
      const { messages, announcedUpdate } =
        MilestoneService.buildProgressAnnouncements({
          result,
          book: { title: 'Duna', logs: [] },
          announced: {},
          userName: 'Thales',
        });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('50 páginas');
      expect(announcedUpdate).toMatchObject({ s_pages_50: true });
    });

    it('returns no messages and a null update when nothing new is crossed', () => {
      const { messages, announcedUpdate } =
        MilestoneService.buildProgressAnnouncements({
          result: {
            sessionSeconds: 60,
            pagesReadToday: 10,
            newTotalPagesRead: 110,
            newTotalBooksCompleted: 0,
            newStreak: 1,
            justCompleted: false,
          },
          book: { title: 'Duna', logs: [] },
          announced: {},
          userName: 'Thales',
        });

      expect(messages).toEqual([]);
      expect(announcedUpdate).toBeNull();
    });

    it('appends a completion message (summing book logs + session) when justCompleted', () => {
      const { messages } = MilestoneService.buildProgressAnnouncements({
        result: { ...result, pagesReadToday: 5, justCompleted: true },
        book: {
          title: 'Conto',
          logs: [{ timeSeconds: 3300 }], // 55 min + 300s session = 3600s = 1.0h
        },
        announced: {},
        userName: 'Thales',
      });

      const completion = messages.find(m => m.includes('Conto'));
      expect(completion).toBeDefined();
      expect(completion).toContain('1.0h');
    });

    it('does not re-announce already announced milestones', () => {
      const { messages, announcedUpdate } =
        MilestoneService.buildProgressAnnouncements({
          result,
          book: { title: 'Duna', logs: [] },
          announced: { s_pages_50: true },
          userName: 'Thales',
        });

      expect(messages).toEqual([]);
      expect(announcedUpdate).toBeNull();
    });
  });

  describe('buildCompletionMessage', () => {
    it('formats hours when the book took over an hour', () => {
      const msg = MilestoneService.buildCompletionMessage(
        'Thales',
        'Duna',
        9000, // 2.5h
      );
      expect(msg).toContain('Duna');
      expect(msg).toContain('2.5h');
    });

    it('formats minutes for short books', () => {
      const msg = MilestoneService.buildCompletionMessage(
        'Thales',
        'Conto',
        600, // 10 min
      );
      expect(msg).toContain('10min');
    });
  });
});
