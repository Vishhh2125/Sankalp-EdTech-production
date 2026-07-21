import { verifyAccessToken } from '../modules/auth/auth.service.js';
import { prisma } from '../prisma/client.js';
import { ADMIN_SECTIONS } from '../constants/adminSections.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.split(' ')[1];
}

async function loadSubAdminSections(userId) {
  const rows = await prisma.subAdminAccess.findMany({
    where: { user_id: userId },
    select: { section: true },
  });
  return rows.map((r) => r.section);
}

function isAdminRole(role) {
  return role === 'ADMIN' || role === 'SUB_ADMIN' || role === 'TEACHER';
}

/**
 * Any authenticated admin or sub-admin (no section check).
 * Use only for endpoints like GET /admin/me.
 */
function requireAnyAdmin() {
  return async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
      const decoded = verifyAccessToken(token);
      if (!isAdminRole(decoded.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.admin = decoded;
      if (decoded.role === 'SUB_ADMIN') {
        req.adminSections = await loadSubAdminSections(decoded.id);
      } else if (decoded.role === 'TEACHER') {
        req.adminSections = ['dashboard', 'dramas', 'live', 'submissions'];
      } else {
        req.adminSections = [...ADMIN_SECTIONS];
      }
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
  };
}

/**
 * Main admin only (cannot be delegated to sub-admins).
 */
function requireMainAdmin() {
  return async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
      const decoded = verifyAccessToken(token);
      if (decoded.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Main admin access required' });
      }
      req.admin = decoded;
      req.adminSections = [...ADMIN_SECTIONS];
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
  };
}

/**
 * Requires admin or sub-admin with optional section permission.
 * - ADMIN: always allowed
 * - SUB_ADMIN without section param: denied (no blanket access)
 * - SUB_ADMIN with section: must have matching sub_admin_access row
 */
function requireAdmin(section = null) {
  return async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
      const decoded = verifyAccessToken(token);

      if (!isAdminRole(decoded.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      if (decoded.role === 'ADMIN') {
        req.admin = decoded;
        req.adminSections = [...ADMIN_SECTIONS];
        return next();
      }

      if (decoded.role === 'TEACHER') {
        const teacherSections = ['dashboard', 'dramas', 'live', 'submissions'];
        if (section && !teacherSections.includes(section)) {
          return res.status(403).json({ error: `No access to ${section}`, section });
        }
        req.admin = decoded;
        req.adminSections = teacherSections;
        return next();
      }

      // Sub-admin: section is mandatory
      if (!section) {
        return res.status(403).json({ error: 'Section permission required' });
      }

      const access = await prisma.subAdminAccess.findFirst({
        where: { user_id: decoded.id, section },
      });

      if (!access) {
        return res.status(403).json({
          error: `No access to ${section}`,
          section,
        });
      }

      req.admin = decoded;
      req.adminSections = await loadSubAdminSections(decoded.id);
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
  };
}

export { requireAdmin, requireAnyAdmin, requireMainAdmin, loadSubAdminSections };
