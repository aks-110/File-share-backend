import { connection } from "../BackBlaze/redisClient.mjs"
const CAPACITY = 1024 * 1024 *1024 * 2; 
const REFILL_RATE = CAPACITY / 3600; 
export async function bandwidthLimiter(key, bytesNeeded) {
  const now = Date.now();

  let data = await connection.get(key);

  let tokens = CAPACITY;
  let lastRefill = now;

  if (data) {
    const parsed = JSON.parse(data);
    tokens = parsed.tokens;
    lastRefill = parsed.lastRefill;
  }

  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(CAPACITY, tokens + elapsed * REFILL_RATE);

  if (tokens < bytesNeeded) {
    return {
      allowed: false,
      remaining: tokens,
    };
  }

  tokens -= bytesNeeded;

  await connection.set(
    key,
    JSON.stringify({ tokens, lastRefill: now }),
    "EX",
    3600
  );

  return {
    allowed: true,
    remaining: tokens,
  };
}