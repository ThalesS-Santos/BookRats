import { useMainStore } from '@core/store/index';

// We just need to test that the store config works, specifically `migrate` and `partialize`.
// Zustand exposes `useMainStore.persist` to access persist options in tests if configured,
// but an easier way is to test the store's initialized state and the partialize function directly if we can,
// or we can just call it by looking at the persist configuration.

// Since Zustand encapsulates the config, the easiest way to get coverage on `index.js`
// is to interact with the store and simulate the persist functions by accessing the middleware directly or through persist methods.

describe('Root Store', () => {
  it('should initialize with correct default state from slices', () => {
    const state = useMainStore.getState();
    expect(state).toHaveProperty('user');
    expect(state).toHaveProperty('books');
    expect(state).toHaveProperty('totalClaps');
    expect(state).toHaveProperty('notifications');
  });

  it('persist partialize should filter out non-persistent data', () => {
    // Zustand persist middleware attaches the options to the store's persist object
    const persistOptions = useMainStore.persist.getOptions();
    
    const mockState = {
      books: ['book1'],
      streak: 5,
      totalPagesRead: 100,
      lastReadDate: '2023',
      maxReadingSession: 50,
      totalBooksCompleted: 2,
      totalClaps: 10,
      unlockedBadges: {},
      
      user: { id: 1 }, // Should NOT persist
      loading: true, // Should NOT persist
    };

    const partial = persistOptions.partialize(mockState);

    expect(partial).toHaveProperty('books', ['book1']);
    expect(partial).toHaveProperty('streak', 5);
    expect(partial).toHaveProperty('totalPagesRead', 100);
    expect(partial).not.toHaveProperty('user');
    expect(partial).not.toHaveProperty('loading');
  });

  it('persist migrate should handle version 0 and version 1', () => {
    const persistOptions = useMainStore.persist.getOptions();
    
    const oldState = { oldProp: true };
    
    // version 0
    const migratedV0 = persistOptions.migrate(oldState, 0);
    expect(migratedV0).toEqual(oldState);

    // version 1
    const migratedV1 = persistOptions.migrate(oldState, 1);
    expect(migratedV1).toEqual(oldState);
  });
});
