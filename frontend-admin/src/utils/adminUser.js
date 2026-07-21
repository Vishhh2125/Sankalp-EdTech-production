import { ADMIN_SECTIONS } from '../config/permissions.js'

/** Normalize API / legacy stored user for admin panel */
export function normalizeAdminUser(user) {
  if (!user) return null

  const role =
    user.role === 'ADMIN' || user.role === 'admin'
      ? 'admin'
      : user.role === 'SUB_ADMIN' || user.role === 'sub_admin'
        ? 'sub_admin'
        : user.role === 'TEACHER' || user.role === 'teacher'
          ? 'teacher'
          : user.role

  const sections =
    role === 'admin'
      ? [...ADMIN_SECTIONS]
      : role === 'teacher'
        ? (
          // If teacher hasn't completed onboarding, force them to only see the profile page
          user.is_profile_complete === false ? ['profile'] : (Array.isArray(user.sections) ? user.sections : ['dramas'])
        )
        : Array.isArray(user.sections)
          ? user.sections
          : []

  return { ...user, role, sections }
}

export function isMainAdmin(user) {
  return normalizeAdminUser(user)?.role === 'admin'
}
