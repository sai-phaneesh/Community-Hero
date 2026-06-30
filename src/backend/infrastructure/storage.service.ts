import crypto from "crypto";
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";

dotenv.config();

const ALLOWED_CONTENT_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  // Videos
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/ogg",
];

export class StorageService {
  private storage: Storage | null = null;
  private bucketName: string | null = null;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || null;
    if (this.bucketName) {
      try {
        this.storage = new Storage();
        console.log(`GCS Storage Service initialized with bucket: ${this.bucketName}`);
      } catch (err) {
        console.error("Failed to initialize Google Cloud Storage client:", err);
      }
    } else {
      console.log("GCS_BUCKET_NAME not set. Storage service operating in local fallback mode.");
    }
  }

  async generateUploadUrl(
    fileName: string,
    contentType: string
  ): Promise<{ uploadUrl: string; publicUrl: string; isLocal: boolean }> {
    // Validate MIME type
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new Error(
        `Invalid file format: "${contentType}". Only images and videos are supported.`
      );
    }

    const fileExtension = fileName.substring(fileName.lastIndexOf("."));
    const uniqueName = `uploads/${crypto.randomUUID()}${fileExtension}`;

    // If GCS is configured, generate a signed write URL
    if (this.storage && this.bucketName) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(uniqueName);

        const [url] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          contentType: contentType,
          extensionHeaders: {
            "cache-control": "public, max-age=31536000, immutable",
          },
        });

        const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${uniqueName}`;
        return { uploadUrl: url, publicUrl, isLocal: false };
      } catch (err) {
        console.error("Error generating GCS signed URL, falling back to local storage:", err);
      }
    }

    // Local Fallback mode
    const publicUrl = `/${uniqueName}`; // Path that the client can request static files from
    return {
      uploadUrl: "/api/upload/local",
      publicUrl,
      isLocal: true,
    };
  }
}
