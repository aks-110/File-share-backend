import { Queue } from 'bullmq';
import { connection } from '../BackBlaze/redisClient.mjs';


export const DeleteQueue = new Queue('DeleteQueue', { connection });
