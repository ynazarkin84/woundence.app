import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = file.fieldname === "wound-image" ? "wounds" : "documents";
    const fullPath = path.join(uploadDir, subDir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${randomUUID()}-${Date.now()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

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
  originalPath: string;
  optimizedPath: string;
  metadata: { width: number; height: number; format: string; size: number };
}

export async function processWoundImage(filePath: string): Promise<ProcessedImage> {
  const sharp = (await import("sharp")).default;

  if (!fs.existsSync(filePath)) throw new Error("Image file not found");
  const stats = fs.statSync(filePath);
  if (stats.size > 10 * 1024 * 1024) throw new Error("Image file too large (max 10MB)");

  const fileBuffer = fs.readFileSync(filePath);
  const sharpInstance = (sharp as any)(fileBuffer, { limitInputPixels: false });

  let metadata: any;
  try {
    metadata = await sharpInstance.metadata();
  } catch {
    const recoveryImage = (sharp as any)(fileBuffer, { density: 72, limitInputPixels: false });
    metadata = await recoveryImage.metadata();
  }

  if (!metadata.width || !metadata.height) throw new Error("Unable to determine image dimensions.");

  const optimizedPath = filePath.replace(/\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i, "-optimized.webp");
  let processedMetadata = metadata;

  try {
    await (sharp as any)(fileBuffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(optimizedPath);
    try {
      processedMetadata = await (sharp as any)(optimizedPath).metadata();
    } catch {}
  } catch {
    try {
      await (sharp as any)(fileBuffer).webp({ quality: 85 }).toFile(optimizedPath);
      try {
        processedMetadata = await (sharp as any)(optimizedPath).metadata();
      } catch {}
    } catch {
      throw new Error("Failed to process image. Please try uploading a different image.");
    }
  }

  const optimizedStats = fs.statSync(optimizedPath);
  return {
    originalPath: filePath,
    optimizedPath,
    metadata: {
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      format: processedMetadata.format || "unknown",
      size: optimizedStats.size,
    },
  };
}

export async function convertImageToBase64(filePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(filePath);
  return imageBuffer.toString("base64");
}

export function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}
