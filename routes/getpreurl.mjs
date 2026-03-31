import { s3 } from "../BackBlaze/client.mjs";
import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import QRCode from "qrcode";
import { Router } from "express";
import generateId from "../utilis/Id.mjs"; // Ensure this matches your file extension
import { rate } from "../rate/ratelimiter.mjs";
import dotenv from "dotenv";
import File from "../Models/FileModel.mjs";
import bcrypt from "bcrypt";
import { DeleteQueue } from "../BullMq/Queue.mjs";

dotenv.config();

export const route = Router();

route.post("/geturl", rate, async (req, res) => {
  try {
    const { password, filesize, fileName } = req.body;
    if (!filesize)
      return res.status(400).json({ message: "FileSize required" });

    const safeName = fileName ? fileName.replace(/\s+/g, "-") : "file.txt";
    const id = generateId();
    const key = `uploads/${id}_${safeName}`;

    // STRICT 24 HOURS (1 Day) SETTINGS
    const EXPIRY_SECONDS = 86400;
    const DELAY_MILLISECONDS = 86400 * 1000;

    let uploadUrl;
    let strategy = "multipart";
    let partsize;
    let actualUploadIdForQueue = null;

    const filesizeinMb = filesize / (1024 * 1024);

    if (filesizeinMb > 5) {
      const command = new CreateMultipartUploadCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
      });
      const response = await s3.send(command);
      uploadUrl = response.UploadId;
      actualUploadIdForQueue = response.UploadId;
      partsize = 5 * 1024 * 1024;
    } else {
      uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key }),
        { expiresIn: EXPIRY_SECONDS },
      );
      strategy = "single";
      partsize = null;
    }

    const hashedpassword = bcrypt.hashSync(password, 10);
    const qrDataUrl = await QRCode.toDataURL(
      `${process.env.FRONTEND_URL}/download/${id}`,
    );

    // Calculate exact expiry date for MongoDB
    const expireDate = new Date(Date.now() + DELAY_MILLISECONDS);

    try {
      await File.create({
        id,
        filekey: key,
        password: hashedpassword,
        filesize,
        expiresAt: expireDate, // <--- YEH LINE MISSING THI! Isse auto-delete chalega
      });
    } catch (err) {
      console.error("DB Create Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    await DeleteQueue.addBulk([
      {
        name: "delete-file",
        data: {
          key: key,
          uploadId: actualUploadIdForQueue,
        },
        opts: {
          delay: DELAY_MILLISECONDS,
          removeOnComplete: true,
        },
      },
      {
        name: "delete-db",
        data: { id: id },
        opts: {
          delay: DELAY_MILLISECONDS,
          removeOnComplete: true,
        },
      },
    ]);

    res.json({ strategy, uploadUrl, id, qrDataUrl, partsize, key });
  } catch (err) {
    console.error("GetUrl Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
