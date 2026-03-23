
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

connection.on("error", (error) => {
  console.error("Redis connection error:", error);
});

