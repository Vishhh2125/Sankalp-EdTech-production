import express from 'express';
import * as ctrl from './content.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createCategorySchema, updateCategorySchema,
  createTagSchema, updateTagSchema,
  createShowSchema, updateShowSchema,
  createEpisodeSchema, updateEpisodeSchema,
} from './content.validation.js';

const router = express.Router();

// ── Categories (public read, admin write) ──
router.get('/categories', ctrl.getCategories);
router.post('/categories', requireAuth, requireAdmin('categories'), validate(createCategorySchema), ctrl.createCategory);
router.put('/categories/:id', requireAuth, requireAdmin('categories'), validate(updateCategorySchema), ctrl.updateCategory);
router.delete('/categories/:id', requireAuth, requireAdmin('categories'), ctrl.deleteCategory);

// ── Tags ──
router.get('/tags', ctrl.getTags);
router.post('/tags', requireAuth, requireAdmin('categories'), validate(createTagSchema), ctrl.createTag);
router.put('/tags/:id', requireAuth, requireAdmin('categories'), validate(updateTagSchema), ctrl.updateTag);
router.delete('/tags/:id', requireAuth, requireAdmin('categories'), ctrl.deleteTag);

// ── Shows (Dramas) ──
router.get('/shows', ctrl.getShows);
router.get('/shows/:id/related', ctrl.getRelatedShows);
router.get('/shows/:id', ctrl.getShow);
router.post('/shows', requireAuth, requireAdmin('dramas'), validate(createShowSchema), ctrl.createShow);
router.put('/shows/:id', requireAuth, requireAdmin('dramas'), validate(updateShowSchema), ctrl.updateShow);
router.delete('/shows/:id', requireAuth, requireAdmin('dramas'), ctrl.deleteShow);
router.patch('/shows/:id/publish', requireAuth, requireAdmin('dramas'), ctrl.togglePublish);
router.patch('/shows/:id/feed-position', requireAuth, requireAdmin('dramas'), ctrl.updateFeedPosition);

// ── Episodes ──
router.get('/shows/:showId/episodes', ctrl.getEpisodes);
router.post('/episodes', requireAuth, requireAdmin('dramas'), validate(createEpisodeSchema), ctrl.createEpisode);
router.put('/episodes/:id', requireAuth, requireAdmin('dramas'), validate(updateEpisodeSchema), ctrl.updateEpisode);
router.delete('/episodes/:id', requireAuth, requireAdmin('dramas'), ctrl.deleteEpisode);

// ── Home (mobile app — public) ──
router.get('/home/banners', ctrl.getHomeBanners);
router.get('/home/hero-banners', ctrl.getHomeHeroBanners);
router.get('/home/announcements', ctrl.getHomeAnnouncements);

export default router;
