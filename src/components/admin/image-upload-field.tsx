"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}

export function ImageUploadField({
  name,
  label,
  folder,
  defaultUrl,
}: {
  name: string;
  label: string;
  folder: string;
  defaultUrl?: string | null;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(`${folder}/${crypto.randomUUID()}${extensionOf(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/vendor-uploads/upload",
      });
      setUrl(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-2">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
        )}
        <Input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
        {uploading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
