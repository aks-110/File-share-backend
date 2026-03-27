import { Worker } from "bullmq";
import dotenv from "dotenv";
import mongoose from "mongoose";
import File from "../Models/FileModel.mjs";
import { connection } from "../BackBlaze/redisClient.mjs";
import { s3 } from "../BackBlaze/client.mjs";
import {
  DeleteObjectCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

if (mongoose.connection.readyState !== 1) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Worker: MongoDB Connected"))
    .catch((err) => console.error("Worker Mongo Error:", err));
}

export const delworker = new Worker(
  "DeleteQueue",
  async (job) => {
    console.log(`[Worker Started] Processing: ${job.name}`);

    switch (job.name) {
      case "delete-file":
        try {
         
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.BUCKET_NAME,
              Key: job.data.key,
            }),
          );
          console.log(` [Worker] Deleted Cloud File: ${job.data.key}`);

         
          if (job.data.uploadId) {
            await s3
              .send(
                new AbortMultipartUploadCommand({
                  Bucket: process.env.BUCKET_NAME,
                  Key: job.data.key,
                  UploadId: job.data.uploadId,
                }),
              )
              .catch(() => {}); 
          }
        } catch (err) {
          console.error(
            ` [Worker] Cloud Deletion failed for ${job.data.key}:`,
            err.message,
          );
        }
        break;

      case "delete-db":
        try {
          const deletedFile = await File.findOneAndDelete({ id: job.data.id });
          if (deletedFile) {
            console.log(` [Worker] Deleted DB Record: ${job.data.id}`);
            await connection.del(`upload:${job.data.id}:parts`);
          }
        } catch (err) {
          console.error(
            `[Worker] DB Deletion failed for ${job.data.id}:`,
            err.message,
          );
        }
        break;
    }
  },
  { connection },
);
