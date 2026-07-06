import multer from "multer";

// Buffers stay in memory only — nothing is ever written to local disk.
// Every upload ends up in Supabase Storage (see supabaseStorage.ts), which is
// what makes file storage (like the database) work the same whether this
// runs on a dev machine or a published app talking to a hosted API server.
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images and PDFs are allowed."), false);
  }
};

export const woundenceUpload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

export interface ProcessedImage {
  buffer: Buffer;
  metadata: { width: number; height: number; format: string; size: number };
}

export async function processWoundImage(fileBuffer: Buffer): Promise<ProcessedImage> {
  const sharp = (await import("sharp")).default;

  if (fileBuffer.length > 10 * 1024 * 1024) throw new Error("Image file too large (max 10MB)");

  let metadata: any;
  try {
    metadata = await (sharp as any)(fileBuffer, { limitInputPixels: false }).metadata();
  } catch {
    metadata = await (sharp as any)(fileBuffer, { density: 72, limitInputPixels: false }).metadata();
  }

  if (!metadata.width || !metadata.height) throw new Error("Unable to determine image dimensions.");

  // This buffer is both what gets stored/displayed in patient history AND
  // what Claude sees for wound analysis — clinically relevant detail (wound
  // margins, tissue color/texture) was being lost at the previous 1200px/q85
  // settings, well below what modern phone cameras capture and below
  // Claude's own ~1568px internal limit, so raising this actually improves
  // analysis accuracy too, not just how the photo looks in the app.
  let optimizedBuffer: Buffer;
  try {
    optimizedBuffer = await (sharp as any)(fileBuffer)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 95 })
      .toBuffer();
  } catch {
    try {
      optimizedBuffer = await (sharp as any)(fileBuffer).webp({ quality: 95 }).toBuffer();
    } catch {
      throw new Error("Failed to process image. Please try uploading a different image.");
    }
  }

  let processedMetadata = metadata;
  try {
    processedMetadata = await (sharp as any)(optimizedBuffer).metadata();
  } catch {}

  return {
    buffer: optimizedBuffer,
    metadata: {
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      format: processedMetadata.format || "unknown",
      size: optimizedBuffer.length,
    },
  };
}
