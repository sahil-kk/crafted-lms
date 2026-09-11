import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const isR2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

const r2Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    })
  : null;

export async function uploadToR2(
  file: File,
  folder: "avatars" | "materials" | "exams" | "general" = "general"
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (isR2Configured && r2Client) {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${Date.now()}-${cleanFileName}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (publicUrl) {
      return `${publicUrl}/${key}`;
    }
    return `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  }

  // Fallback: return base64 data URL
  const base64 = buffer.toString("base64");
  return `data:${file.type || "application/octet-stream"};base64,${base64}`;
}
