// import IORedis from 'ioredis';

// export const connection = new IORedis({
//   host: process.env.REDIS_HOST || "localhost",
//   port: process.env.REDIS_PORT || 6379,
  
//   password: process.env.REDIS_PASSWORD || undefined,
//   maxRetriesPerRequest: null
// });


import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

connection.on("error", (error) => {
  console.error("Redis connection error:", error);
});

