import { slidingWindowLimiter } from "./slidingWindow.mjs";

export const rate = async (req, res, next) => {
  try {
    // 🔥 FIX 2: Proxy ke piche se Asli Client IP nikalne ka solid tareeqa
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.ip ||
      req.connection.remoteAddress;

    const key = `rate_limit:${ip}`;

    const result = await slidingWindowLimiter(key);

    if (!result.allowed) {
      return res.status(429).json({
        message: "Too many requests from your IP",
      });
    }

    next();
  } catch (err) {
    console.error("Rate limiter error:", err);
    // Error aane par block na karein, request aage jane dein
    next();
  }
};
