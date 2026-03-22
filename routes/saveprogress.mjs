import express from "express";
import {connection} from "../BackBlaze/redisClient.mjs";
export const route = express.Router();

route.post("/save-progress", async (req, res) => {
  const { id, partNumber } = req.body;
 
   await connection.sadd(`upload:${id}:parts`, partNumber);
 
   res.send({ success: true });
});
