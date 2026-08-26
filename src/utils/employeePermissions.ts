/** Super Admin employee rows can only be changed by a Super Admin. */
export function isSuperAdminRecordLocked(
  actorRole?: string | null,
  targetRole?: string | null
): boolean {
  return targetRole === 'super_admin' && actorRole !== 'super_admin';
}
