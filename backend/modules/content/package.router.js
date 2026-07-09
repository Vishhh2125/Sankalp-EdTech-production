import express from 'express';
import { requireAuth, allowGuest } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as service from './package.service.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────

// Create Package
router.post('/admin/packages', requireAuth, requireAdmin('packages'), async (req, res, next) => {
  try {
    const pkg = await service.createPackage(req.body, req.admin.id);
    return res.status(201).json(new ApiResponse(201, pkg, 'Package created successfully'));
  } catch (e) {
    next(e);
  }
});

// Update Package
router.put('/admin/packages/:id', requireAuth, requireAdmin('packages'), async (req, res, next) => {
  try {
    const pkg = await service.updatePackage(req.params.id, req.body, req.admin.id);
    return res.json(new ApiResponse(200, pkg, 'Package updated successfully'));
  } catch (e) {
    next(e);
  }
});

// Delete Package
router.delete('/admin/packages/:id', requireAuth, requireAdmin('packages'), async (req, res, next) => {
  try {
    const result = await service.deletePackage(req.params.id, req.admin.id);
    return res.json(new ApiResponse(200, result, 'Package deleted successfully'));
  } catch (e) {
    next(e);
  }
});

// Get All Packages (Admin)
router.get('/admin/packages', requireAuth, requireAdmin('packages'), async (req, res, next) => {
  try {
    const list = await service.getPackagesAdmin();
    return res.json(new ApiResponse(200, list, 'Packages retrieved successfully'));
  } catch (e) {
    next(e);
  }
});

// Get Package by ID (Admin)
router.get('/admin/packages/:id', requireAuth, requireAdmin('packages'), async (req, res, next) => {
  try {
    const pkg = await service.getPackageById(req.params.id);
    if (!pkg) {
      return res.status(404).json(new ApiResponse(404, null, 'Package not found'));
    }
    return res.json(new ApiResponse(200, pkg, 'Package retrieved successfully'));
  } catch (e) {
    next(e);
  }
});


// ─────────────────────────────────────────────────────────────────
// USER / PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────

// Get Active Packages
router.get('/packages/active', allowGuest, async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const list = await service.getActivePackages(userId);
    return res.json(new ApiResponse(200, list, 'Active packages retrieved successfully'));
  } catch (e) {
    next(e);
  }
});

// Get Package Detail (User)
router.get('/packages/:id/detail', allowGuest, async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const detail = await service.getPackageDetailUser(req.params.id, userId);
    return res.json(new ApiResponse(200, detail, 'Package details retrieved successfully'));
  } catch (e) {
    next(e);
  }
});

// Purchase Package (User)
router.post('/packages/:id/buy', requireAuth, async (req, res, next) => {
  try {
    const result = await service.purchasePackage(req.params.id, req.user.id);
    return res.json(new ApiResponse(200, result, result.message));
  } catch (e) {
    next(e);
  }
});

export default router;
