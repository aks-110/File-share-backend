import express from "express";
import { connection } from "../BackBlaze/redisClient.mjs";
export const route = express.Router();

route.post("/save-progress", async (req, res) => {
  try {
    const { id, partNumber, etag } = req.body;

    await connection.sadd(`upload:${id}:parts`, `${partNumber}::${etag}`);

    await connection.expire(`upload:${id}:parts`, 86400);

    res.send({ success: true });
  } catch (err) {
    console.error("Save progress error:", err);
    res.status(500).send({ error: "Failed to save progress" });
  }
});
