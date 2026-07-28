import * as service from './certificate.service.js';

async function getUserCertificates(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await service.getUserCertificates(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getCertificateForCourse(req, res, next) {
  try {
    const userId = req.user.id;
    const { showId } = req.params;
    const result = await service.getCertificateForCourse(userId, showId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getCertificateConfig(req, res, next) {
  try {
    const { showId } = req.params;
    const result = await service.getCertificateConfig(showId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateCertificateConfig(req, res, next) {
  try {
    const { showId } = req.params;
    const result = await service.updateCertificateConfig(showId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export {
  getUserCertificates,
  getCertificateForCourse,
  getCertificateConfig,
  updateCertificateConfig,
};
