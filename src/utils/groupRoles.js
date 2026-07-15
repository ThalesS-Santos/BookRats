/**
 * Helpers de papéis de grupo — fonte ÚNICA de verdade para "quem é admin".
 *
 * Schema: grupos têm um array `admins` (multi-admin). Grupos LEGADOS criados
 * antes dessa mudança só possuem `adminId` (admin único) — daí o fallback.
 * Mantenha cliente e firestore.rules alinhados a esta mesma lógica.
 */

/** @returns {string[]} uids dos admins do grupo. */
export function getGroupAdmins(group) {
  if (!group) return [];
  if (Array.isArray(group.admins)) return group.admins;
  return group.adminId ? [group.adminId] : [];
}

/** @returns {boolean} se `uid` é admin do grupo. */
export function isGroupAdmin(group, uid) {
  if (!uid) return false;
  return getGroupAdmins(group).includes(uid);
}

/**
 * "Membro mais antigo" para sucessão de admin. O array `members` preserva a
 * ordem de entrada (criação = [fundador, ...]; arrayUnion sempre anexa no fim),
 * então o primeiro membro restante (excluindo quem está saindo) é o mais antigo.
 *
 * @param {string[]} members  uids na ordem de entrada
 * @param {string} excludeUid quem está saindo
 * @returns {string|null}
 */
export function getOldestMemberId(members, excludeUid) {
  return (members || []).find(id => id !== excludeUid) || null;
}
