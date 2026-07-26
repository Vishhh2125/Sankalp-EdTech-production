import { prisma } from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Generate clean URL slug from string
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');    // Replace multiple - with single -
}

/**
 * Get all CMS pages (Admin) ordered by created_at ASC
 */
export async function getAllPagesAdmin() {
  return prisma.cmsPage.findMany({
    orderBy: { created_at: 'asc' },
  });
}

/**
 * Get CMS page by ID (Admin)
 */
export async function getPageByIdAdmin(id) {
  const page = await prisma.cmsPage.findUnique({
    where: { id },
  });
  if (!page) {
    throw new ApiError(404, 'CMS page not found');
  }
  return page;
}

/**
 * Create new CMS page (Admin)
 */
export async function createPageAdmin({ name, slug, content, status = 'draft' }) {
  if (!name || !name.trim()) {
    throw new ApiError(400, 'Page name is required');
  }

  const cleanSlug = slugify(slug || name);
  if (!cleanSlug) {
    throw new ApiError(400, 'Invalid page slug');
  }

  const existing = await prisma.cmsPage.findUnique({
    where: { slug: cleanSlug },
  });
  if (existing) {
    throw new ApiError(400, `CMS page with slug '${cleanSlug}' already exists`);
  }

  const validStatus = status === 'published' ? 'published' : 'draft';

  return prisma.cmsPage.create({
    data: {
      name: name.trim(),
      slug: cleanSlug,
      content: content || '',
      status: validStatus,
      version: 1,
    },
  });
}

/**
 * Update existing CMS page (Admin)
 */
export async function updatePageAdmin(id, { name, slug, content, status }) {
  const existingPage = await getPageByIdAdmin(id);

  const cleanSlug = slug ? slugify(slug) : existingPage.slug;
  if (cleanSlug !== existingPage.slug) {
    const slugConflict = await prisma.cmsPage.findUnique({
      where: { slug: cleanSlug },
    });
    if (slugConflict && slugConflict.id !== id) {
      throw new ApiError(400, `CMS page with slug '${cleanSlug}' already exists`);
    }
  }

  const hasContentChanged = content !== undefined && content !== existingPage.content;
  const newVersion = hasContentChanged ? existingPage.version + 1 : existingPage.version;

  const validStatus = status
    ? (status === 'published' ? 'published' : 'draft')
    : existingPage.status;

  return prisma.cmsPage.update({
    where: { id },
    data: {
      name: name ? name.trim() : existingPage.name,
      slug: cleanSlug,
      content: content !== undefined ? content : existingPage.content,
      status: validStatus,
      version: newVersion,
    },
  });
}

/**
 * Update status only (Publish / Unpublish) (Admin)
 */
export async function updatePageStatusAdmin(id, status) {
  await getPageByIdAdmin(id);
  const validStatus = status === 'published' ? 'published' : 'draft';

  return prisma.cmsPage.update({
    where: { id },
    data: { status: validStatus },
  });
}

/**
 * Delete CMS page (Admin)
 */
export async function deletePageAdmin(id) {
  await getPageByIdAdmin(id);
  return prisma.cmsPage.delete({
    where: { id },
  });
}

/**
 * Get all published CMS pages for client app, ordered by created_at ASC
 */
export async function getPublishedPagesClient() {
  return prisma.cmsPage.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      name: true,
      slug: true,
      updated_at: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });
}

/**
 * Get single published CMS page by slug for client app
 */
export async function getPublishedPageBySlugClient(slug) {
  const cleanSlug = slugify(slug);
  const page = await prisma.cmsPage.findFirst({
    where: {
      slug: cleanSlug,
      status: 'published',
    },
  });

  if (!page) {
    throw new ApiError(404, 'CMS page not found or is not published');
  }

  return page;
}
