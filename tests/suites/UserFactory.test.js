import { UserFactory } from '../factories/UserFactory';

describe('UserFactory', () => {
  it('creates a user with default values', () => {
    const user = UserFactory.create();
    expect(user).toHaveProperty('uid');
    expect(user).toHaveProperty('name');
    expect(user.stats).toHaveProperty('totalBooks');
  });

  it('creates a user with overrides', () => {
    const user = UserFactory.create({
      name: 'Overridden Name',
      stats: { totalBooks: 99 },
    });
    expect(user.name).toBe('Overridden Name');
    expect(user.stats.totalBooks).toBe(99);
  });
});
