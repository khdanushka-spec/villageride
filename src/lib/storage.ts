import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/**
 * File storage abstraction. Currently persists to local disk under
 * /public/uploads, which works for local development and single-instance
 * hosting. For serverless deployment (Vercel), swap this implementation for
 * @vercel/blob's `put()` — the call sites in actions/*.ts don't need to change.
 */
export async function saveUploadedFile(file: File, folder: string): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, folder);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);

  return `/uploads/${folder}/${filename}`;
}

export async function saveUploadedFiles(files: File[], folder: string): Promise<string[]> {
  return Promise.all(files.map((file) => saveUploadedFile(file, folder)));
}
