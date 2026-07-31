import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

const ALLOWED_FOLDERS = ["vendors/logos", "products/images"];

/**
 * Issues client tokens for direct browser-to-Blob uploads of vendor logos
 * and product photos. Unlike the driver-documents upload (which happens
 * before an account exists and so can't be gated behind auth), this is only
 * ever used from the Super Admin catalog screens, so it's gated up front.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const allowed = ALLOWED_FOLDERS.some((folder) => pathname.startsWith(`${folder}/`));
        if (!allowed) throw new Error("Invalid upload destination.");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
