import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookStore } from '../store/useBookStore';

describe('Gamification & Badge Logic Audit', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Ensure store is clean before each test
    useBookStore.setState({
      totalClaps: 0,
      unlockedBadges: {},
      books: [],
      streak: 0,
      totalPagesRead: 0
    });
  });

  describe('Scenario 1: The Boundary (Threshold Validation)', () => {
    it('should stay locked at 49 claps and unlock at 50 claps', () => {
      // 1. Set to 49
      useBookStore.getState().setClaps(49);
      expect(useBookStore.getState().unlockedBadges['influenciador']).toBeUndefined();

      // 2. Set to 50
      useBookStore.getState().setClaps(50);
      const badge = useBookStore.getState().unlockedBadges['influenciador'];
      expect(badge).toBeDefined();
      expect(badge.id).toBe('influenciador');
      expect(badge.title).toBe('Influenciador');
      expect(badge.dateUnlocked).toBeDefined();
    });
  });

  describe('Scenario 2: Persistence Survival', () => {
    it('should survive a rehydration by recovering from mocked storage', async () => {
      // 1. Prepare disk state
      const mockState = {
        state: { 
          totalClaps: 55, 
          unlockedBadges: { 
            influenciador: { id: 'influenciador', title: 'Influenciador', dateUnlocked: '2026-04-18T10:00:00Z' } 
          } 
        },
        version: 0
      };
      await AsyncStorage.setItem('bookrats-library-storage', JSON.stringify(mockState));

      // 2. Trigger rehydration
      await useBookStore.persist.rehydrate();

      // 4. Verify recovery
      const badge = useBookStore.getState().unlockedBadges['influenciador'];
      expect(badge).toBeDefined();
      expect(badge.dateUnlocked).toBe('2026-04-18T10:00:00Z');
      expect(useBookStore.getState().totalClaps).toBe(55);
    });
  });

  describe('Scenario 3: Security (Achievement Integrity)', () => {
    it('should NOT overwrite the original dateUnlocked when claps are increased further', async () => {
      // 1. First unlock at 50
      useBookStore.getState().setClaps(50);
      const firstUnlockDate = useBookStore.getState().unlockedBadges['influenciador'].dateUnlocked;

      // 2. Fast forward time slightly (conceptually)
      await new Promise(r => setTimeout(r, 10));

      // 3. Increase to 100
      useBookStore.getState().setClaps(100);
      
      // 4. Verify date remains the same (immutable once unlocked)
      const secondCheckDate = useBookStore.getState().unlockedBadges['influenciador'].dateUnlocked;
      expect(secondCheckDate).toBe(firstUnlockDate);
    });

    it('should NOT remove the badge if claps decrease (Non-regressive Glory)', () => {
       // 1. Unlock at 60
       useBookStore.getState().setClaps(60);
       expect(useBookStore.getState().unlockedBadges['influenciador']).toBeDefined();

       // 2. Decrease claps below threshold (e.g., due to moderation or logic)
       useBookStore.getState().setClaps(10);

       // 3. Verify it stays unlocked (uma conquista, uma vez ganha, não deve ser removida)
       expect(useBookStore.getState().unlockedBadges['influenciador']).toBeDefined();
       expect(useBookStore.getState().totalClaps).toBe(10);
    });
  });

  describe('Future-Proofing: Other Badges Support', () => {
    it('should automatically unlock other ALL_BADGES when conditions are met', () => {
       // Mission: 'badge_page_100' -> 100 pages
       useBookStore.setState({ totalPagesRead: 99 });
       useBookStore.getState().checkAchievements();
       expect(useBookStore.getState().unlockedBadges['badge_page_100']).toBeUndefined();

       useBookStore.setState({ totalPagesRead: 100 });
       useBookStore.getState().checkAchievements();
       expect(useBookStore.getState().unlockedBadges['badge_page_100']).toBeDefined();
       expect(useBookStore.getState().unlockedBadges['badge_page_100'].title).toBe('Cem Páginas');
    });
  });
});
