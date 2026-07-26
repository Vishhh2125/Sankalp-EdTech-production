import * as cmsService from './cms.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export async function getPagesAdmin(req, res, next) {
  try {
    const pages = await cmsService.getAllPagesAdmin();
    return res.status(200).json(new ApiResponse(200, pages, 'CMS pages retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getPageByIdAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const page = await cmsService.getPageByIdAdmin(id);
    return res.status(200).json(new ApiResponse(200, page, 'CMS page retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

export async function createPageAdmin(req, res, next) {
  try {
    const { name, slug, content, status } = req.body;
    const page = await cmsService.createPageAdmin({ name, slug, content, status });
    return res.status(201).json(new ApiResponse(201, page, 'CMS page created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function updatePageAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug, content, status } = req.body;
    const page = await cmsService.updatePageAdmin(id, { name, slug, content, status });
    return res.status(200).json(new ApiResponse(200, page, 'CMS page updated successfully'));
  } catch (error) {
    next(error);
  }
}

export async function updateStatusAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const page = await cmsService.updatePageStatusAdmin(id, status);
    return res.status(200).json(new ApiResponse(200, page, `CMS page status updated to ${page.status}`));
  } catch (error) {
    next(error);
  }
}

export async function deletePageAdmin(req, res, next) {
  try {
    const { id } = req.params;
    await cmsService.deletePageAdmin(id);
    return res.status(200).json(new ApiResponse(200, null, 'CMS page deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getPublishedPagesClient(req, res, next) {
  try {
    const pages = await cmsService.getPublishedPagesClient();
    return res.status(200).json(new ApiResponse(200, pages, 'Published CMS pages retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getPublishedPageBySlugClient(req, res, next) {
  try {
    const { slug } = req.params;
    const page = await cmsService.getPublishedPageBySlugClient(slug);
    return res.status(200).json(new ApiResponse(200, page, 'CMS page details retrieved successfully'));
  } catch (error) {
    next(error);
  }
}
