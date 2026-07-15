import {
  getGroupAdmins,
  isGroupAdmin,
  getOldestMemberId,
} from '@utils/groupRoles';

describe('groupRoles', () => {
  describe('getGroupAdmins', () => {
    it('returns the admins array when present (multi-admin)', () => {
      expect(getGroupAdmins({ admins: ['a', 'b'] })).toEqual(['a', 'b']);
    });

    it('falls back to [adminId] for legacy groups', () => {
      expect(getGroupAdmins({ adminId: 'a' })).toEqual(['a']);
    });

    it('prefers admins over legacy adminId', () => {
      expect(getGroupAdmins({ admins: ['a'], adminId: 'z' })).toEqual(['a']);
    });

    it('returns [] for null/empty', () => {
      expect(getGroupAdmins(null)).toEqual([]);
      expect(getGroupAdmins({})).toEqual([]);
    });
  });

  describe('isGroupAdmin', () => {
    it('detects an admin via array', () => {
      expect(isGroupAdmin({ admins: ['a', 'b'] }, 'b')).toBe(true);
    });

    it('detects an admin via legacy adminId', () => {
      expect(isGroupAdmin({ adminId: 'a' }, 'a')).toBe(true);
    });

    it('is false for a non-admin or missing uid', () => {
      expect(isGroupAdmin({ admins: ['a'] }, 'x')).toBe(false);
      expect(isGroupAdmin({ admins: ['a'] }, undefined)).toBe(false);
    });
  });

  describe('getOldestMemberId', () => {
    it('returns the first remaining member (by join order)', () => {
      expect(getOldestMemberId(['admin', 'm2', 'm3'], 'admin')).toBe('m2');
    });

    it('skips the leaving uid wherever it sits', () => {
      expect(getOldestMemberId(['m1', 'm2'], 'm1')).toBe('m2');
    });

    it('returns null when no one remains', () => {
      expect(getOldestMemberId(['solo'], 'solo')).toBeNull();
      expect(getOldestMemberId([], 'x')).toBeNull();
    });
  });
});
