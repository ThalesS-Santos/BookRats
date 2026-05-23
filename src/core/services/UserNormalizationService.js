/**
 * UserNormalizationService
 * Centralized service to normalize user fields like display names and avatars
 * to prevent inconsistent states and visual glitches in the UI.
 */
export const UserNormalizationService = {
  /**
   * Resolves the best available display name for a user.
   * Prioritizes displayName -> username -> senderName -> email prefix -> 'Leitor'.
   *
   * @param {Object} user - User document or authentication state.
   * @returns {string} Clean, printable display name.
   */
  normalizeDisplayName(user) {
    if (!user) return 'Leitor';
    const name =
      user.displayName || user.username || user.senderName || user.name;
    if (name && typeof name === 'string' && name.trim()) {
      return name.trim();
    }
    if (user.email && typeof user.email === 'string') {
      return user.email.split('@')[0];
    }
    return 'Leitor';
  },

  /**
   * Resolves the best available avatar source URL for a user.
   * Prioritizes photoURL -> profilePic -> senderAvatar -> avatar -> avatarUrl -> null.
   *
   * @param {Object} user - User document or authentication state.
   * @returns {string|null} Resolved image source URL or null.
   */
  normalizeUserAvatar(user) {
    if (!user) return null;
    const pic =
      user.photoURL ||
      user.profilePic ||
      user.senderAvatar ||
      user.avatar ||
      user.avatarUrl;
    if (pic && typeof pic === 'string' && pic.trim()) {
      return pic.trim();
    }
    return null;
  },
};

/**
 * Direct export shorthand for normalizeDisplayName
 */
export const normalizeDisplayName = user =>
  UserNormalizationService.normalizeDisplayName(user);

/**
 * Direct export shorthand for normalizeUserAvatar
 */
export const normalizeUserAvatar = user =>
  UserNormalizationService.normalizeUserAvatar(user);
