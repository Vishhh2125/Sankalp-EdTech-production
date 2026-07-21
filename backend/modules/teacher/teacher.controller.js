import { prisma } from '../../prisma/client.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { AppError } from '../../middleware/error.middleware.js';

export async function getTeacherProfile(req, res, next) {
  try {
    if (req.user.role !== 'TEACHER') throw new AppError('Access denied', 403);
    const profile = await prisma.teacherProfile.findUnique({ where: { user_id: req.user.id } });
    return res.json(new ApiResponse(200, profile || null, 'Profile fetched'));
  } catch (err) { next(err); }
}

export async function putTeacherProfile(req, res, next) {
  try {
    if (req.user.role !== 'TEACHER') throw new AppError('Access denied', 403);
    const data = req.body || {};

    const hasPhoto = !!data.profile_photo_url?.trim();
    const hasName = !!data.full_name?.trim();
    const hasHeadline = !!data.professional_headline?.trim();
    const hasBio = !!data.bio?.trim();
    const hasExp = data.experience_years !== undefined && data.experience_years !== null && String(data.experience_years).trim() !== '';
    const hasQual = !!data.qualification?.trim();

    data.is_completed = hasPhoto && hasName && hasHeadline && hasBio && hasExp && hasQual;

    const upsert = await prisma.teacherProfile.upsert({
      where: { user_id: req.user.id },
      update: {
        profile_photo_url: data.profile_photo_url || null,
        full_name: data.full_name || '',
        professional_headline: data.professional_headline || '',
        bio: data.bio || '',
        experience_years: parseInt(data.experience_years) || 0,
        qualification: data.qualification || '',
        is_completed: data.is_completed
      },
      create: {
        user_id: req.user.id,
        profile_photo_url: data.profile_photo_url || null,
        full_name: data.full_name || '',
        professional_headline: data.professional_headline || '',
        bio: data.bio || '',
        experience_years: parseInt(data.experience_years) || 0,
        qualification: data.qualification || '',
        is_completed: data.is_completed
      }
    });
    return res.json(new ApiResponse(200, upsert, 'Profile saved'));
  } catch (err) { next(err); }
}

export default { getTeacherProfile, putTeacherProfile };
