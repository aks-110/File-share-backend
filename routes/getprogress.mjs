import express from "express";
import { connection } from "../BackBlaze/redisClient.mjs";
export const route = express.Router();

route.get("/get-progress", async (req, res) => {
  try {
    const { id } = req.query;
    
    const partsRaw = await connection.smembers(`upload:${id}:parts`);

    // 🔥 FIX 3: String ko wapas PartNumber aur ETag mein tod kar React ko bheja
    const uploadedParts = partsRaw.map(item => {
      const [partNumStr, etag] = item.split("::");
      return { PartNumber: Number(partNumStr), ETag: etag };
    });

    res.send({ uploadedParts });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to fetch progress" });
  }
});