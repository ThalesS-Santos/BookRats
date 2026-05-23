/**
 * @typedef {import('@core/types').User} User
 */

export const UserFactory = {
  /**
   * Generates a realistic mock User object based on JSDoc types.
   * @param {Partial<User>} [overrides]
   * @returns {User}
   */
  create: (overrides = {}) => ({
    uid: `user-${Math.random().toString(36).substring(2, 9)}`,
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    email: `test${Math.floor(Math.random() * 1000)}@bookrats.com`,
    photoURL: `https://i.pravatar.cc/150?u=${Math.random()}`,
    bio: 'Avid reader and rat lover.',
    stats: {
      totalBooks: Math.floor(Math.random() * 50),
      totalClaps: Math.floor(Math.random() * 200),
      currentStreak: Math.floor(Math.random() * 10),
    },
    ...overrides,
  }),
};
