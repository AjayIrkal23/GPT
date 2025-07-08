import { FastifyInstance } from "fastify";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { AnnotatedImageModel } from "../models/anotated.model";

export async function boundingBoxRoutes(app: FastifyInstance) {
  app.get("/boundingBox/:employeeId/*", async (req, reply) => {
    const { employeeId } = req.params as { employeeId: string };
    const rawPath = req.raw.url || "";
    const imagePath = decodeURIComponent(rawPath.split(`${employeeId}/`)[1]);

    if (!employeeId || !imagePath) {
      return reply.status(400).send({
        success: false,
        message: "Missing employeeId or imagePath",
      });
    }

    const imageDoc = await AnnotatedImageModel.findOne({
      employeeId,
      imagePath,
    });

    if (!imageDoc) {
      return reply.status(404).send({
        success: false,
        message: "Annotated image not found",
      });
    }

    const absolutePath = path.join(__dirname, "../..", imagePath);

    let originalImageBuffer: Buffer;
    try {
      originalImageBuffer = await fs.readFile(absolutePath);
    } catch {
      return reply.status(404).send({
        success: false,
        message: "Image file not found on disk",
      });
    }

    const targetWidth = 800;
    const targetHeight = 600;

    const resized = await sharp(originalImageBuffer)
      .resize(targetWidth, targetHeight)
      .ensureAlpha()
      .toBuffer();

    const overlays: sharp.OverlayOptions[] = [];

    for (const detail of imageDoc.details) {
      let { x, y, width, height } = detail.boundingBox || {};

      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof width !== "number" ||
        typeof height !== "number"
      ) {
        continue;
      }

      if (width < 0) {
        x += width;
        width = Math.abs(width);
      }
      if (height < 0) {
        y += height;
        height = Math.abs(height);
      }

      if (width <= 1 || height <= 1) continue;

      const color =
        detail.isValid === true
          ? "#059669"
          : detail.isValid === false
          ? "#b91c1c"
          : "#ca8a04";

      const label = detail.violationName ?? "Unknown";

      const svg = `
        <svg width="${width}" height="${
        height + 20
      }" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="20" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="5"/>
          <rect x="0" y="0" width="${width}" height="20" fill="${color}" opacity="0.9"/>
          <text x="4" y="14" font-size="12" fill="#ffffff" font-family="Arial" dominant-baseline="middle">
            ${label}
          </text>
        </svg>
      `;

      overlays.push({
        input: Buffer.from(svg),
        top: Math.round(y - 20 >= 0 ? y - 20 : y), // shift up if possible
        left: Math.round(x),
      });
    }

    try {
      const output = await sharp(resized).composite(overlays).png().toBuffer();

      reply
        .header("Content-Type", "image/png")
        .header("Cross-Origin-Resource-Policy", "cross-origin")
        .send(output);
    } catch (err) {
      console.error("❌ Sharp error:", err);
      return reply.status(500).send({
        success: false,
        message: "Failed to generate annotated image",
        error: (err as Error).message,
      });
    }
  });
}
