import { createAuthenticatedApi } from './api';
import { API_BASE_URL } from '../constants/config';

// Dedicated axios instance for /api/content (coursework routes use this prefix, NOT /api/v1)
const contentApi = createAuthenticatedApi({
  baseURL: API_BASE_URL + '/api/content',
});

// ── Coursework API Service ──
// Wraps all backend coursework endpoints for the mobile client.

export const courseworkApi = {
  // Assignments
  getAssignments: (showId) =>
    contentApi.get(`/shows/${showId}/assignments`),

  submitAssignment: (assignmentId, formData) =>
    contentApi.post(`/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Materials
  getMaterials: (showId) =>
    contentApi.get(`/shows/${showId}/materials`),

  // Quizzes
  getQuizzes: (showId) =>
    contentApi.get(`/shows/${showId}/quizzes`),

  getQuizQuestions: (quizId) =>
    contentApi.get(`/quizzes/${quizId}/questions`),

  submitQuizAttempt: (quizId, answers) =>
    contentApi.post(`/quizzes/${quizId}/attempt`, {
      answers: answers.map((answer) => ({
        question_id: answer.question_id,
        option_id: answer.selected_option_id,
      })),
    }),

  // Certificates
  getCertificateStatus: (showId) =>
    contentApi.get(`/user/certificates/${showId}`),

  getUserCertificates: () =>
    contentApi.get(`/user/certificates`),
};

// Helper: format bytes to human-readable
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
