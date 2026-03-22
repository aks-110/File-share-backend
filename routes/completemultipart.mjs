import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { s3 } from "../BackBlaze/client.mjs";
import { Router } from "express";

export const route = Router();

route.post("/completeMultipart", async (req, res) => {
  try {
    const { uploadId, key, parts } = req.body;

    if (!parts || parts.length === 0) {
      throw new Error("Parts array is empty. Nothing to complete.");
    }

    // 1. Tukdo ko sahi sequence mein lagana (1, 2, 3...)
    parts.sort((a, b) => a.PartNumber - b.PartNumber);

    // 2. AWS Strict Formatting (ETag Validation)
    const cleanParts = parts.map((p) => {
      // Agar ETag gayab hai (Purana upload resume kiya gaya hai)
      if (!p.ETag || p.ETag === "undefined" || p.ETag === "null") {
        throw new Error(
          `ETag is missing for Part ${p.PartNumber}. Please start a fresh upload.`,
        );
      }

      // AWS S3 ETag hamesha double quotes (" ") mein mangta hai
      let formattedEtag = p.ETag;
      if (!formattedEtag.startsWith('"')) {
        formattedEtag = `"${formattedEtag}"`;
      }

      return {
        PartNumber: Number(p.PartNumber),
        ETag: formattedEtag,
      };
    });

    console.log(`Telling AWS to combine ${cleanParts.length} parts...`);

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: cleanParts,
      },
    });

    await s3.send(command);

    console.log("✅ Multipart Upload Combined Successfully!");
    res.json({ success: true });
  } catch (error) {
    // 🔥 AB HUMEIN EXACT ERROR PATA CHALEGA
    console.error("🔥 COMPLETE MULTIPART ERROR:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to complete upload" });
  }
});
