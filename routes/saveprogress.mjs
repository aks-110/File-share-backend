import express from "express";
import { connection } from "../BackBlaze/redisClient.mjs";
export const route = express.Router();

route.post("/save-progress", async (req, res) => {
  try {
    const { id, partNumber } = req.body;

    // Save the part number in a Redis Set
    await connection.sadd(`upload:${id}:parts`, partNumber);

    // 🔥 FIX: Set expiry for 24 hours so Redis doesn't get full
    await connection.expire(`upload:${id}:parts`, 86400);

    res.send({ success: true });
  } catch (err) {
    console.error("Save progress error:", err);
    res.status(500).send({ error: "Failed to save progress" });
  }
});
