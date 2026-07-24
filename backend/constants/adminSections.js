/**
 * Admin panel permission keys — aligned with frontend nav page IDs.
 * Stored in sub_admin_access.section.
 */
export const ADMIN_SECTIONS = [
  'dashboard',
  'users',
  'dramas',
  'categories',
  'banners',
  'hero_banners',
  'membership',
  'topup',
  'coins',
  'notifications',
  'analytics',
  'roles',
  'cms',
  'live',
  'coursework',
  'submissions',
  'packages',
  'student_onboarding',
  'assign_courses',
];

export const SECTION_LABELS = {
  dashboard: 'Dashboard',
  users: 'User Management',
  dramas: 'Drama / Content',
  categories: 'Categories & Tags',
  banners: 'Banners & Popups',
  hero_banners: 'Hero Section',
  membership: 'Membership Plans',
  topup: 'Top-Up Plans',
  coins: 'Coins & Wallet',
  notifications: 'Notifications',
  analytics: 'Analytics & Reports',
  roles: 'Roles & Permissions',
  cms: 'CMS Pages',
  live: 'Live Streaming',
  coursework: 'Coursework Management',
  submissions: 'Submissions',
  packages: 'Packages',
  student_onboarding: 'Student Onboarding',
  assign_courses: 'Assign Courses',
};

export function isValidSection(section) {
  return ADMIN_SECTIONS.includes(section);
}

export function normalizeSections(sections) {
  // Sub-admins cannot be granted roles management (main admin only)
  const list = Array.isArray(sections)
    ? sections
    : typeof sections === 'string'
      ? sections.split(',').map((section) => section.trim()).filter(Boolean)
      : [];

  const unique = [...new Set(list.filter((s) => isValidSection(s) && s !== 'roles'))];
  return unique;
}

/** Map DB role enum to frontend role string */
export function toFrontendRole(role) {
  if (role === 'ADMIN') return 'admin';
  if (role === 'SUB_ADMIN') return 'sub_admin';
  if (role === 'TEACHER') return 'teacher';
  return 'user';
}