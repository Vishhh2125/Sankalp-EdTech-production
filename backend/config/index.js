import dotenv from 'dotenv';

dotenv.config();

export default {
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessTtl: parseInt(process.env.JWT_ACCESS_TTL) || 3600,
  jwtRefreshTtl: parseInt(process.env.JWT_REFRESH_TTL) || 2592000,

  // MinIO
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    bucket: process.env.MINIO_BUCKET || 'ott-media',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // HLS direct delivery signing. Must match nginx HLS_SIGNING_SECRET.
  hls: {
    signingSecret: process.env.HLS_SIGNING_SECRET || 'ott-dev-hls-signing-secret-change-me',
    signedUrlTtl: parseInt(process.env.HLS_SIGNED_URL_TTL) || 7200,
  },

  // Meilisearch
  meiliHost: process.env.MEILI_HOST || 'http://localhost:7700',
  meiliKey: process.env.MEILI_MASTER_KEY || '',

  // Bcrypt
  bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
};
