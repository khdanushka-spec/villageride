import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import path from "node:path";

/**
 * File storage abstraction, backed by Vercel Blob. Works identically in
 * local dev (via BLOB_READ_WRITE_TOKEN in .env.local, pulled from the
 * `villageride-uploads` store) and in production — unlike local disk, which
 * does not persist on Vercel's serverless filesystem.
 */
export async function saveUploadedFile(file: File, folder: string): Promise<string> {
  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;

  const blob = await put(`${folder}/${filename}`, file, {
    access: "public",
    addRandomSuffix: false,
  });

  return blob.url;
}

export async function saveUploadedFiles(files: File[], folder: string): Promise<string[]> {
  return Promise.all(files.map((file) => saveUploadedFile(file, folder)));
}
