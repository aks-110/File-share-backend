import express from "express";
import { connection } from "../BackBlaze/redisClient.mjs";
export const route = express.Router();
route.get("/get-progress", async (req, res) => {
  const { id } = req.query;
  
  const parts = await connection.smembers(`upload:${id}:parts`);

  res.send({
    uploadedParts: parts.map(Number),
  });
});