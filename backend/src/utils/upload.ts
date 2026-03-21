import { MultipartFile } from "@fastify/multipart";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");

export async function saveUploadedFile(
  file: MultipartFile,
  subdir: string
): Promise<string> {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed");
  }

  const ext = EXT_MAP[file.mimetype];
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(UPLOADS_ROOT, subdir);

  await mkdir(dir, { recursive: true });

  const buffer = await file.toBuffer();
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${subdir}/${filename}`;
}

export async function deleteUploadedFile(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOADS_ROOT, imageUrl.replace("/uploads/", ""));
  try {
    await unlink(filePath);
  } catch {
    // File may already be deleted — ignore
  }
}
