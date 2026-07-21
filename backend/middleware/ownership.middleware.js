import { verifyAccessToken } from '../modules/auth/auth.service.js';
import { prisma } from '../prisma/client.js';
import { ADMIN_SECTIONS } from '../constants/adminSections.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.split(' ')[1];
}

function isAdminRole(role) {
  return role === 'ADMIN' || role === 'SUB_ADMIN';
}

/**
 * Middleware that allows ADMIN, SUB_ADMIN (with section), or TEACHER (with ownership)
 * Usage: requireAdminOrTeacher('dramas')
 */
function requireAdminOrTeacher(section = null) {
  return async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Missing token' });

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Admins: always allowed
    if (decoded.role === 'ADMIN') {
      req.admin = decoded;
      req.adminSections = [...ADMIN_SECTIONS];
      return next();
    }

    // Sub-admin: must have explicit section
    if (decoded.role === 'SUB_ADMIN') {
      if (!section) return res.status(403).json({ error: 'Section permission required' });
      const access = await prisma.subAdminAccess.findFirst({ where: { user_id: decoded.id, section } });
      if (!access) return res.status(403).json({ error: `No access to ${section}` });
      req.admin = decoded;
      req.adminSections = await prisma.subAdminAccess.findMany({ where: { user_id: decoded.id }, select: { section: true } }).then(r => r.map(x => x.section));
      return next();
    }

    // Teacher: must have completed profile (except when uploading their own profile photo) and own the resource for write actions
    if (decoded.role === 'TEACHER') {
      const isUploadingOwnProfilePhoto = 
        (req.path.includes('/upload') || req.path.includes('/confirm')) && 
        req.body.type === 'teacher_profile' && 
        req.body.entity_id === decoded.id;

      const profile = await prisma.teacherProfile.findUnique({ where: { user_id: decoded.id } });
      if (!isUploadingOwnProfilePhoto) {
        if (!profile || !profile.is_completed) {
          return res.status(403).json({ error: 'Teacher profile incomplete' });
        }
      }

      req.admin = decoded; // reuse req.admin to represent authenticated actor
      req.adminSections = ['dashboard', 'dramas', 'live', 'submissions'];

      // Strip sensitive parameters from write request body
      if (req.body) {
        delete req.body.is_active;
        delete req.body.feed_position;
        delete req.body.teacher_id; // prevent teacher from changing ownership
        if (req.body.approval_status && req.body.approval_status !== 'DRAFT' && req.body.approval_status !== 'PENDING_REVIEW') {
          delete req.body.approval_status;
        }
      }

      // Ownership checks for write operations
      const method = req.method.toUpperCase();
      if (method !== 'GET') {
        // 1. Shows (Dramas)
        if (section === 'dramas') {
          if (req.params.id) {
            const show = await prisma.show.findUnique({ where: { id: req.params.id } });
            if (!show) return res.status(404).json({ error: 'Show not found' });
            if (show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }
        }

        // 2. Episodes
        if (section === 'dramas' && req.path.includes('/episodes')) {
          const episodeId = req.params.id || req.body.id;
          if (episodeId) {
            const ep = await prisma.episode.findUnique({ where: { id: episodeId } });
            if (!ep) return res.status(404).json({ error: 'Episode not found' });
            const parentShow = await prisma.show.findUnique({ where: { id: ep.show_id } });
            if (!parentShow || parentShow.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }

          if (req.body.show_id) {
            const parentShow = await prisma.show.findUnique({ where: { id: req.body.show_id } });
            if (!parentShow || parentShow.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }
        }

        // 3. Coursework (assignments, materials, quizzes)
        if (section === 'coursework') {
          // Check showId parameter on creation
          if (req.params.showId) {
            const show = await prisma.show.findUnique({ where: { id: req.params.showId } });
            if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }

          // Assignment edits/deletes
          if (req.path.includes('/assignments')) {
            const assignmentId = req.params.id;
            if (assignmentId) {
              const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
              if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
              const show = await prisma.show.findUnique({ where: { id: assignment.show_id } });
              if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
            }
          }

          // Material edits/deletes
          if (req.path.includes('/materials')) {
            const materialId = req.params.id;
            if (materialId) {
              const material = await prisma.material.findUnique({ where: { id: materialId } });
              if (!material) return res.status(404).json({ error: 'Material not found' });
              const show = await prisma.show.findUnique({ where: { id: material.show_id } });
              if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
            }
          }

          // Quiz / Question edits/deletes
          if (req.path.includes('/quizzes')) {
            const quizId = req.params.id;
            if (quizId) {
              const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
              if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
              const show = await prisma.show.findUnique({ where: { id: quiz.show_id } });
              if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
            }

            const questionId = req.params.questionId;
            if (questionId) {
              const question = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
              if (!question) return res.status(404).json({ error: 'Question not found' });
              const quiz = await prisma.quiz.findUnique({ where: { id: question.quiz_id } });
              if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
              const show = await prisma.show.findUnique({ where: { id: quiz.show_id } });
              if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
            }
          }
        }

        // 4. Submissions
        if (section === 'submissions') {
          const submissionId = req.params.id;
          if (submissionId) {
            const submission = await prisma.assignmentSubmission.findUnique({
              where: { id: submissionId },
              include: { assignment: true }
            });
            if (!submission) return res.status(404).json({ error: 'Submission not found' });
            const show = await prisma.show.findUnique({ where: { id: submission.assignment.show_id } });
            if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }
        }

        // 5. Live Streams
        if (section === 'live') {
          if (req.body.show_id) {
            const show = await prisma.show.findUnique({ where: { id: req.body.show_id } });
            if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }

          const streamId = req.params.id;
          if (streamId) {
            const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
            if (!stream) return res.status(404).json({ error: 'Stream not found' });
            if (stream.created_by !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }
        }

        // 6. Media Uploads & Confirmations
        if (section === 'dramas' && (req.path.includes('/upload') || req.path.includes('/confirm'))) {
          const showId = req.body.show_id;
          const episodeId = req.body.episode_id;
          const type = req.body.type;
          const entityId = req.body.entity_id;

          if (showId) {
            const show = await prisma.show.findUnique({ where: { id: showId } });
            if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }
          if (episodeId) {
            const ep = await prisma.episode.findUnique({ where: { id: episodeId } });
            if (!ep) return res.status(404).json({ error: 'Episode not found' });
            const show = await prisma.show.findUnique({ where: { id: ep.show_id } });
            if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
          }
          if (entityId && type) {
            if (type.startsWith('show')) {
              const show = await prisma.show.findUnique({ where: { id: entityId } });
              if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
            } else if (type.startsWith('episode')) {
              const ep = await prisma.episode.findUnique({ where: { id: entityId } });
              if (!ep) return res.status(404).json({ error: 'Episode not found' });
              const show = await prisma.show.findUnique({ where: { id: ep.show_id } });
              if (!show || show.teacher_id !== decoded.id) return res.status(403).json({ error: 'Access denied' });
            } else if (type === 'teacher_profile') {
              if (entityId !== decoded.id) return res.status(403).json({ error: 'Access denied' });
            }
          }
        }
      }

      return next();
    }

    return res.status(403).json({ error: 'Admin access required' });
  };
}

export { requireAdminOrTeacher };
