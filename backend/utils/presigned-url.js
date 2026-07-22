import { minioClient } from '../config/minio.js';
import config from '../config/index.js';

const INTERNAL = `http://minio:9000`;
const PUBLIC = (process.env.MINIO_PUBLIC_HOST || INTERNAL).replace(/\/$/, '');

function toPublic(url) {
  if (!url) return '';
  // Convert http://minio:9000/ott-media/... or http://<host>:8080/ott-media/... to relative /ott-media/...
  const match = url.match(/\/ott-media\/.*/);
  if (match) return match[0];
  return url.replace(/^https?:\/\/[^/]+/, '');
}

async function getPresignedPutUrl(objectName, expirySeconds = 900) {
  const url = await minioClient.presignedPutObject(config.minio.bucket, objectName, expirySeconds);
  return toPublic(url);
}

async function getPresignedGetUrl(objectName, expirySeconds = 7200) {
  const url = await minioClient.presignedGetObject(config.minio.bucket, objectName, expirySeconds);
  return toPublic(url);
}

function getPublicUrl(objectName) {

  return `${PUBLIC}/${config.minio.bucket}/${objectName}`;
  // Return relative path so Nginx can proxy to MinIO seamlessly
  // return `/${config.minio.bucket}/${objectName}`;
}

export { getPresignedPutUrl, getPresignedGetUrl, getPublicUrl };