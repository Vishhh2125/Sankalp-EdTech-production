import express from 'express';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import * as cmsController from './cms.controller.js';

export const adminCmsRouter = express.Router();
export const clientCmsRouter = express.Router();

// ── Admin Endpoints (/api/v1/admin/cms) ──────────────────────────
adminCmsRouter.get('/', requireAdmin('cms'), cmsController.getPagesAdmin);
adminCmsRouter.get('/:id', requireAdmin('cms'), cmsController.getPageByIdAdmin);
adminCmsRouter.post('/', requireAdmin('cms'), cmsController.createPageAdmin);
adminCmsRouter.put('/:id', requireAdmin('cms'), cmsController.updatePageAdmin);
adminCmsRouter.patch('/:id/status', requireAdmin('cms'), cmsController.updateStatusAdmin);
adminCmsRouter.delete('/:id', requireAdmin('cms'), cmsController.deletePageAdmin);

// ── Client Endpoints (/api/v1/cms) ───────────────────────────────
clientCmsRouter.get('/pages', cmsController.getPublishedPagesClient);
clientCmsRouter.get('/pages/:slug', cmsController.getPublishedPageBySlugClient);
