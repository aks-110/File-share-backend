import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import {s3} from '../BackBlaze/client.mjs'
import { Router } from "express";
export const route = Router();

route.post("/completeMultipart", async (req, res) => {
  try {
    const { uploadId, key, parts } = req.body;
    parts.sort((a,b)=>a.PartNumber - b.PartNumber);
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
      }
    });

    await s3.send(command);
     
    res.json({ success: true });
  } catch (error) {
    
    return res.status(500).json({ error: error.message });
  }
});
