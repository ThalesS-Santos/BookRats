/**
 * MilestoneService
 *
 * Replaces the old "send a chat message on every progress update" spam with a
 * curated set of lifetime achievements. Each milestone fires AT MOST ONCE per
 * user (tracked via a persisted `announcedMilestones` map), so the group chat
 * only ever celebrates real, reachable landmarks in the user's journey.
 *
 * Milestones are organized into groups. When several tiers of the same group
 * are crossed in a single update (e.g. a 2h session also clears 30min and 1h),
 * only the HIGHEST newly-reached tier produces a message, but every crossed
 * tier is marked as announced so the lower ones never fire later.
 */

const MILESTONES = [
  // --- Single reading session: time spent without stopping ---
  {
    id: 's_time_30',
    group: 'session_time',
    threshold: 1800, // 30 min
    message: u => `🎯 @${u} leu 30 minutos seguidos!`,
  },
  {
    id: 's_time_60',
    group: 'session_time',
    threshold: 3600, // 1 h
    message: u => `⏱️ @${u} encarou 1 hora de leitura sem parar!`,
  },
  {
    id: 's_time_120',
    group: 'session_time',
    threshold: 7200, // 2 h
    message: u => `🔥 @${u} mergulhou 2 horas seguidas no livro!`,
  },

  // --- Single reading session: pages read in one sitting ---
  {
    id: 's_pages_50',
    group: 'session_pages',
    threshold: 50,
    message: u => `📖 @${u} virou 50 páginas em uma só sessão!`,
  },
  {
    id: 's_pages_100',
    group: 'session_pages',
    threshold: 100,
    message: u => `🚀 @${u} devorou 100 páginas de uma só vez!`,
  },

  // --- Lifetime total pages read ---
  {
    id: 't_pages_1000',
    group: 'total_pages',
    threshold: 1000,
    message: u => `🏅 @${u} alcançou 1.000 páginas lidas no total!`,
  },
  {
    id: 't_pages_5000',
    group: 'total_pages',
    threshold: 5000,
    message: u => `🏆 @${u} passou das 5.000 páginas lidas!`,
  },
  {
    id: 't_pages_10000',
    group: 'total_pages',
    threshold: 10000,
    message: u => `👑 @${u} ultrapassou 10.000 páginas lidas!`,
  },

  // --- Lifetime books completed ---
  {
    id: 'books_1',
    group: 'books',
    threshold: 1,
    message: u => `🎉 @${u} concluiu o primeiro livro!`,
  },
  {
    id: 'books_5',
    group: 'books',
    threshold: 5,
    message: u => `📚 @${u} já concluiu 5 livros!`,
  },
  {
    id: 'books_10',
    group: 'books',
    threshold: 10,
    message: u => `🌟 @${u} chegou a 10 livros concluídos!`,
  },
  {
    id: 'books_25',
    group: 'books',
    threshold: 25,
    message: u => `💎 @${u} concluiu 25 livros — uma biblioteca inteira!`,
  },

  // --- Reading streak (consecutive days) ---
  {
    id: 'streak_7',
    group: 'streak',
    threshold: 7,
    message: u => `🔥 @${u} manteve 7 dias seguidos de leitura!`,
  },
  {
    id: 'streak_30',
    group: 'streak',
    threshold: 30,
    message: u => `⚡ @${u} está há 30 dias seguidos lendo!`,
  },
  {
    id: 'streak_100',
    group: 'streak',
    threshold: 100,
    message: u => `🦾 @${u} alcançou 100 dias de sequência!`,
  },
];

/** Maps each milestone group to the current value it should be compared against. */
const groupValues = ctx => ({
  session_time: ctx.sessionSeconds || 0,
  session_pages: ctx.sessionPages || 0,
  total_pages: ctx.totalPagesRead || 0,
  books: ctx.totalBooksCompleted || 0,
  streak: ctx.streak || 0,
});

export const MilestoneService = {
  MILESTONES,

  /**
   * Detects which lifetime milestones were newly reached in this update.
   *
   * @param {object} ctx        Current values { sessionSeconds, sessionPages, totalPagesRead, totalBooksCompleted, streak }.
   * @param {object} announced  Map of milestone ids already announced ({ [id]: true }).
   * @param {string} userName   Display name used inside the messages.
   * @returns {{ messages: string[], newlyAnnounced: string[] }}
   */
  detect(ctx, announced = {}, userName = 'Leitor') {
    const values = groupValues(ctx);
    const newlyAnnounced = [];
    const highestByGroup = new Map();

    for (const m of MILESTONES) {
      if (Object.prototype.hasOwnProperty.call(announced, m.id)) continue;
      if ((values[m.group] || 0) < m.threshold) continue;

      newlyAnnounced.push(m.id);
      const current = highestByGroup.get(m.group);
      if (!current || m.threshold > current.threshold) {
        highestByGroup.set(m.group, m);
      }
    }

    const messages = Array.from(highestByGroup.values()).map(m =>
      m.message(userName),
    );
    return { messages, newlyAnnounced };
  },

  /**
   * Pure orchestration helper: from a `updateBookProgress` result, produces the
   * full ordered list of chat messages to post (lifetime milestones + the
   * per-book completion message) and the updated `announcedMilestones` map.
   *
   * Keeps the milestone *decision-making* in the domain service so the store
   * slice only has to perform the I/O (sending messages, persisting the map).
   *
   * @param {object}   params
   * @param {object}   params.result    Return value of `updateBookProgress`
   *   ({ sessionSeconds, pagesReadToday, newTotalPagesRead,
   *      newTotalBooksCompleted, newStreak, justCompleted }).
   * @param {object}   params.book      The book being updated ({ title, logs }).
   * @param {object}   params.announced Persisted announced-milestone map.
   * @param {string}   params.userName  Display name for the messages.
   * @returns {{ messages: string[], announcedUpdate: object|null }}
   *   `announcedUpdate` is null when no new lifetime milestone was reached.
   */
  buildProgressAnnouncements({ result, book, announced = {}, userName }) {
    const { messages, newlyAnnounced } = MilestoneService.detect(
      {
        sessionSeconds: result.sessionSeconds,
        sessionPages: result.pagesReadToday,
        totalPagesRead: result.newTotalPagesRead,
        totalBooksCompleted: result.newTotalBooksCompleted,
        streak: result.newStreak,
      },
      announced,
      userName,
    );

    const chatMessages = [...messages];

    // Per-book completion message (not deduped — fires each completion).
    if (result.justCompleted) {
      const bookSeconds =
        (book.logs || []).reduce(
          (sum, logEntry) => sum + (logEntry.timeSeconds || 0),
          0,
        ) + (result.sessionSeconds || 0);
      chatMessages.push(
        MilestoneService.buildCompletionMessage(
          userName,
          book.title,
          bookSeconds,
        ),
      );
    }

    let announcedUpdate = null;
    if (newlyAnnounced.length > 0) {
      announcedUpdate = {
        ...announced,
        ...Object.fromEntries(newlyAnnounced.map(id => [id, true])),
      };
    }

    return { messages: chatMessages, announcedUpdate };
  },

  /**
   * Builds the per-book completion message (fires every time a book is
   * finished, independent of the lifetime milestone dedupe).
   *
   * @param {string} userName
   * @param {string} bookTitle
   * @param {number} totalSeconds  Total time spent on the book across sessions.
   */
  buildCompletionMessage(userName, bookTitle, totalSeconds = 0) {
    const hours = totalSeconds / 3600;
    const label =
      hours >= 1
        ? `${hours.toFixed(1)}h`
        : `${Math.max(1, Math.round(totalSeconds / 60))}min`;
    return `✅ @${userName} terminou "${bookTitle}" em ~${label} de leitura!`;
  },
};

export default MilestoneService;
