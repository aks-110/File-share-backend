import { Queue } from "bullmq";
import { connection } from "../BackBlaze/redisClient.mjs";

export const DeleteQueue = new Queue("DeleteQueue", {
  connection,
  defaultJobOptions: {
    removeOnComplete: true, // Keeps Redis memory clean
    removeOnFail: 1000, // Keep last 1000 failed jobs for debugging
  },
});
