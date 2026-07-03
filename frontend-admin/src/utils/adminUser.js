import { ADMIN_SECTIONS } from '../config/permissions.js'

/** Normalize API / legacy stored user for admin panel */
export function normalizeAdminUser(user) {
  if (!user) return null

  const role =
    user.role === 'ADMIN' || user.role === 'admin'
      ? 'admin'
      : user.role === 'SUB_ADMIN' || user.role === 'sub_admin'
        ? 'sub_admin'
        : user.role

  const sections =
    role === 'admin'
      ? [...ADMIN_SECTIONS]
      : Array.isArray(user.sections)
        ? user.sections
        : []

  return { ...user, role, sections }
}

export function isMainAdmin(user) {
  return normalizeAdminUser(user)?.role === 'admin'
}
