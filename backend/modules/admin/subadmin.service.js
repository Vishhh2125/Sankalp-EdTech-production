import { prisma } from '../../prisma/client.js';
import { hashPassword } from '../auth/auth.service.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  ADMIN_SECTIONS,
  normalizeSections,
  toFrontendRole,
} from '../../constants/adminSections.js';
import { logAdminActivity } from '../../utils/adminActivity.js';

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatAdminUser(user, sections = []) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: initials(user.name),
    role: toFrontendRole(user.role),
    status: user.isBlocked ? 'Inactive' : 'Active',
    sections: user.role === 'ADMIN' ? [...ADMIN_SECTIONS] : sections,
    lastActive: user.updatedAt
      ? new Date(user.updatedAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—',
    createdAt: user.createdAt,
  };
}

export async function getAdminProfile(userId, role) {
  if (role === 'ADMIN') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found');
    return formatAdminUser(user, [...ADMIN_SECTIONS]);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { sub_admin_access: { select: { section: true } } },
  });
  if (!user) throw new ApiError(404, 'User not found');

  const sections = user.sub_admin_access.map((a) => a.section);
  return formatAdminUser(user, sections);
}

export async function listAdmins() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUB_ADMIN'] } },
    include: { sub_admin_access: { select: { section: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });

  return users.map((u) =>
    formatAdminUser(
      u,
      u.sub_admin_access.map((a) => a.section)
    )
  );
}

export async function createSubAdmin(actorId, data) {
  const { name, email, password, sections } = data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const normalized = normalizeSections(sections || []);
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: passwordHash,
      role: 'SUB_ADMIN',
      plan: null,
      coins: 0,
      isBlocked: false,
      sub_admin_access: {
        create: normalized.map((section) => ({ section })),
      },
    },
    include: { sub_admin_access: { select: { section: true } } },
  });

  await logAdminActivity({
    userId: actorId,
    action: `Created sub-admin ${user.name}`,
    entityType: 'Roles',
    entityId: user.id,
  });

  return formatAdminUser(
    user,
    user.sub_admin_access.map((a) => a.section)
  );
}

export async function updateSubAdmin(actorId, subAdminId, data) {
  const user = await prisma.user.findUnique({ where: { id: subAdminId } });
  if (!user) throw new ApiError(404, 'Sub-admin not found');
  if (user.role === 'ADMIN') throw new ApiError(403, 'Cannot modify main admin');
  if (user.role !== 'SUB_ADMIN') throw new ApiError(400, 'User is not a sub-admin');

  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.email) updateData.email = data.email.toLowerCase().trim();
  if (typeof data.isBlocked === 'boolean') updateData.isBlocked = data.isBlocked;
  if (data.password) updateData.password = await hashPassword(data.password);

  if (data.email && data.email !== user.email) {
    const dup = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (dup && dup.id !== subAdminId) throw new ApiError(409, 'Email already in use');
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.user.update({ where: { id: subAdminId }, data: updateData });
    }

    if (data.sections) {
      const normalized = normalizeSections(data.sections);
      await tx.subAdminAccess.deleteMany({ where: { user_id: subAdminId } });
      if (normalized.length > 0) {
        await tx.subAdminAccess.createMany({
          data: normalized.map((section) => ({ user_id: subAdminId, section })),
        });
      }
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: subAdminId },
    include: { sub_admin_access: { select: { section: true } } },
  });

  await logAdminActivity({
    userId: actorId,
    action: `Updated sub-admin ${updated.name}`,
    entityType: 'Roles',
    entityId: subAdminId,
  });

  return formatAdminUser(
    updated,
    updated.sub_admin_access.map((a) => a.section)
  );
}

export async function deleteSubAdmin(actorId, subAdminId) {
  const user = await prisma.user.findUnique({ where: { id: subAdminId } });
  if (!user) throw new ApiError(404, 'Sub-admin not found');
  if (user.role === 'ADMIN') throw new ApiError(403, 'Cannot delete main admin');
  if (user.role !== 'SUB_ADMIN') throw new ApiError(400, 'User is not a sub-admin');

  await prisma.user.delete({ where: { id: subAdminId } });

  await logAdminActivity({
    userId: actorId,
    action: `Deleted sub-admin ${user.name}`,
    entityType: 'Roles',
    entityId: subAdminId,
  });

  return { success: true };
}

export async function listActivityLogs(limit = 50) {
  const logs = await prisma.adminActivityLog.findMany({
    take: limit,
    orderBy: { created_at: 'desc' },
    include: { user: { select: { name: true } } },
  });

  return logs.map((log) => ({
    admin: log.user.name,
    action: log.action,
    module: log.entity_type || '—',
    date: new Date(log.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));
}
