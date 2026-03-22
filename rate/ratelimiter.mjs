import { slidingWindowLimiter } from "./slidingWindow.mjs";

export const rate = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;

    const key = `rate_limit:${ip}`;

    const result = await slidingWindowLimiter(key);

    if (!result.allowed) {
      return res.status(429).json({
        message: "Too many requests",
      });
    }

    next();
  } catch (err) {
    console.error("Rate limiter error:", err);
  }
};