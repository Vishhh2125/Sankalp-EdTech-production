import { minioClient } from '../config/minio.js';
import config from '../config/index.js';

const INTERNAL = `http://minio:9000`;
const PUBLIC = (process.env.MINIO_PUBLIC_HOST || INTERNAL).replace(/\/$/, '');

function toPublic(url) {
  return url.replace(INTERNAL, PUBLIC);
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
}

export { getPresignedPutUrl, getPresignedGetUrl, getPublicUrl };