import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

connection.on("error", (error) => {
  console.error("Redis connection error:", error);
});

connection.on("connect", () => {
  console.log("Redis connection established");
});
