import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Router } from "express";
import {s3} from "../BackBlaze/client.mjs"
export const route = Router();

route.post("/multipart", async (req, res) => {
  try{
    const { key,uploadId, parts } = req.body;
    const urls = [];
    for (let i = 1; i <= parts; i++) {
      const command = new UploadPartCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: i,
      });

      const url = await getSignedUrl(s3, command, {
        expiresIn: 3600,
      });

      urls.push(url);
    }

    return res.json({ urls });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});