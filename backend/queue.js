import { Queue } from 'bullmq';
import redis from './config/redis.js';

const transcodeQueue = new Queue('transcode-queue', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,  // auto-delete completed jobs, keep last 50 for reference
    removeOnFail: 100,     // keep last 100 failed jobs for debugging
  },
});

export default transcodeQueue;