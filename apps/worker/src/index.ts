import { Worker } from 'bullmq';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

const worker = new Worker(
  'pdf-render-queue',
  async (job) => {
    console.log('Processing job', job.id);
    // Call PDF service here
  },
  { connection },
);

worker.on('error', (error) => {
  console.error('Worker error', error.message);
});

console.log('Worker started');
