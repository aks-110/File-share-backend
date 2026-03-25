import { s3 } from "../BackBlaze/client.mjs";
import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import QRCode from "qrcode";
import { Router } from "express";
import generateId from "../utilis/Id.js";
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
    const EXPIRY_SECONDS = 86400; // 24 hours in seconds
    const DELAY_MILLISECONDS = 86400 * 1000; // 24 hours in ms for BullMQ

    let uploadUrl;
    let strategy = "multipart";
    let partsize;

    const filesizeinMb = filesize / (1024 * 1024);

    if (filesizeinMb > 5) {
      const command = new CreateMultipartUploadCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
      });
      const response = await s3.send(command);
      uploadUrl = response.UploadId;
      partsize = 5 * 1024 * 1024;
    } else {
      uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key }),
        { expiresIn: EXPIRY_SECONDS }, // strictly 24 hours
      );
      strategy = "single";
      partsize = null;
    }

    const hashedpassword = bcrypt.hashSync(password, 10);
    const qrDataUrl = await QRCode.toDataURL(
      `${process.env.FRONTEND_URL}/download/${id}`,
    );

    try {
      await File.create({
        id,
        filekey: key,
        password: hashedpassword,
        filesize,
      });
    } catch (err) {
      console.error("DB Create Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // Add jobs to Queue with STRICT 24 HOUR DELAY
    await DeleteQueue.addBulk([
      {
        name: "delete-file",
        data: { key: key },
        opts: {
          delay: DELAY_MILLISECONDS,
          removeOnComplete: true, // Auto-clean the queue list itself
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
