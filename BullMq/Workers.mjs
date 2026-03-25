import { Worker } from "bullmq";
import dotenv from "dotenv";
dotenv.config();
import File from "../Models/FileModel.mjs";
import { connection } from "../BackBlaze/redisClient.mjs";
import { s3 } from "../BackBlaze/client.mjs";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";

// Ensure mongoose is connected inside worker context
if (mongoose.connection.readyState !== 1) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Worker: MongoDB Connected");
    })
    .catch((err) => console.error("Worker Mongo Error:", err));
}

export const delworker = new Worker(
  "DeleteQueue",
  async (job) => {
    console.log(`[Worker Started] Processing job: ${job.name}`);

    switch (job.name) {
      // 1. Delete from Backblaze Cloud
      case "delete-file":
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.BUCKET_NAME,
              Key: job.data.key,
            }),
          );
          console.log(
            ` [Worker Success] Deleted Cloud File: ${job.data.key}`,
          );
        } catch (err) {
          console.error(
            ` [Worker Error] Cloud Deletion failed for ${job.data.key}:`,
            err.message,
          );
        }
        break;

      // 2. Delete from MongoDB
      case "delete-db":
        try {
          const deletedFile = await File.findOneAndDelete({ id: job.data.id });
          if (deletedFile) {
            console.log(
              ` [Worker Success] Deleted DB Record: ${job.data.id}`,
            );

            // 3. Delete from Redis (Clean up progress tracking early if it exists)
            await connection.del(`upload:${job.data.id}:parts`);
          } else {
            console.log(
              `ℹ [Worker Info] DB Record ${job.data.id} not found (Already deleted or cancelled)`,
            );
          }
        } catch (err) {
          console.error(
            ` [Worker Error] DB Deletion failed for ${job.data.id}:`,
            err.message,
          );
        }
        break;

      default:
        console.log(`Unknown job type: ${job.name}`);
        break;
    }
  },
  { connection },
);

delworker.on("completed", (job) => {
  // Silent success to keep terminal clean, handled inside switch statement
});

delworker.on("failed", (job, err) => {
  console.error(`🔥 [Worker FATAL] Job ${job?.name} failed permanently:`, err);
});

delworker.on("error", (err) => {
  console.error("🔥 [Worker CONNECTION ERROR]:", err);
});
