import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const ALLOWED_FOLDERS = [
  "documents/license",
  "documents/nic",
  "documents/vehicle-registration",
  "documents/insurance",
  "documents/revenue-licence",
  "documents/emission-test",
  "documents/police-clearance",
  "documents/grama-niladhari",
  "documents/medical",
  "documents/fitness",
  "documents/profile",
  "documents/vehicle-photos",
];

/**
 * Issues client tokens for direct browser-to-Blob uploads during driver
 * registration. Registration happens before an account exists, so this
 * can't be gated behind auth() — instead it's constrained to a fixed set of
 * destination folders, a small set of document file types, and a per-file
 * size cap.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const allowed = ALLOWED_FOLDERS.some((folder) => pathname.startsWith(`${folder}/`));
        if (!allowed) throw new Error("Invalid upload destination.");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
