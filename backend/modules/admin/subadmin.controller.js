import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  listAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  listActivityLogs,
  getAdminProfile,
} from './subadmin.service.js';

export const getAdminMe = asyncHandler(async (req, res) => {
  const profile = await getAdminProfile(req.admin.id, req.admin.role);
  return res.json(new ApiResponse(200, profile, 'Admin profile fetched'));
});

export const getSubAdmins = asyncHandler(async (req, res) => {
  const admins = await listAdmins();
  return res.json(new ApiResponse(200, admins, 'Admins fetched'));
});

export const postSubAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, sections } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
  const admin = await createSubAdmin(req.admin.id, { name, email, password, sections });
  return res.status(201).json(new ApiResponse(201, admin, 'Sub-admin created'));
});

export const patchSubAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, sections, status } = req.body;
  const isBlocked = status === 'Inactive' ? true : status === 'Active' ? false : undefined;
  const admin = await updateSubAdmin(req.admin.id, req.params.id, {
    name,
    email,
    password,
    sections,
    isBlocked,
  });
  return res.json(new ApiResponse(200, admin, 'Sub-admin updated'));
});

export const removeSubAdmin = asyncHandler(async (req, res) => {
  await deleteSubAdmin(req.admin.id, req.params.id);
  return res.json(new ApiResponse(200, null, 'Sub-admin deleted'));
});

export const getActivityLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const logs = await listActivityLogs(limit);
  return res.json(new ApiResponse(200, logs, 'Activity logs fetched'));
});
