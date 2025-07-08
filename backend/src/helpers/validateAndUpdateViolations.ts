import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import wrap from "word-wrap";
import { AnnotatedImageModel } from "../models/anotated.model";
import { createCanvas, loadImage } from "canvas";
import { sendMultipleViolationsToOpenAI } from "./sendMultipleViolationsToOpenAI";

export async function validateAndUpdateViolations() {
  const images = await AnnotatedImageModel.find({
    details: { $elemMatch: { isValid: null } },
  });

  const outputDir = path.join(__dirname, "../../croppedimages");
  await fs.mkdir(outputDir, { recursive: true });

  for (const img of images) {
    const absImagePath = path.join(__dirname, "../../", img.imagePath);

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(absImagePath);
    } catch {
      console.warn("❌ Missing image:", absImagePath);
      continue;
    }

    const resized = await sharp(buffer).resize(800, 600).toBuffer();
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext("2d");
    const image = await loadImage(resized);
    ctx.drawImage(image, 0, 0);

    const updatedDetails = [...img.details];
    const croppedInputs: {
      imagePath: string;
      violationName: string;
      description: string;
      detailIndex: number;
      severity: string;
    }[] = [];

    // ✅ Safely extract fields from Mongoose subdocuments
    const toValidate = img.details
      .map((d, index) => ({
        index,
        violationName: d.violationName,
        description: d.description,
        boundingBox: d.boundingBox,
        isValid: d.isValid,
      }))
      .filter((d) => d.isValid == null);

    if (toValidate.length === 0) {
      console.warn(`⚠️ Skipping ${img.imageName}: no isValid === null`);
      continue;
    }

    for (const item of toValidate) {
      const box = item.boundingBox;

      if (
        !box ||
        typeof box.x !== "number" ||
        typeof box.y !== "number" ||
        typeof box.width !== "number" ||
        typeof box.height !== "number"
      ) {
        console.warn(
          `⚠️ Skipping invalid boundingBox for:`,
          item.violationName
        );
        continue;
      }

      let { x, y, width, height } = box;

      if (width < 0) {
        x += width;
        width = Math.abs(width);
      }
      if (height < 0) {
        y += height;
        height = Math.abs(height);
      }

      const cropCanvas = createCanvas(width, height);
      const cropCtx = cropCanvas.getContext("2d");
      cropCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

      cropCtx.fillStyle = "black";
      cropCtx.font = "12px sans-serif";
      const lines = wrap(item.violationName, { width: 30 }).split("\n");
      const h = lines.length * 14 + 6;
      const w =
        Math.max(...lines.map((line) => cropCtx.measureText(line).width)) + 8;
      cropCtx.fillRect(cropCanvas.width - w, 0, w, h);

      cropCtx.fillStyle = "white";
      lines.forEach((line, i) => {
        cropCtx.fillText(line, cropCanvas.width - w + 4, 12 + i * 14);
      });

      const filename = `cropped_${uuidv4()}.jpeg`;
      const fullPath = path.join(outputDir, filename);
      await fs.writeFile(fullPath, cropCanvas.toBuffer("image/jpeg"));

      croppedInputs.push({
        imagePath: fullPath,
        violationName: item.violationName,
        description: item.description,
        detailIndex: item.index,
        severity: "High",
      });
    }

    if (croppedInputs.length === 0) {
      console.warn(
        `⚠️ No valid bounding boxes to process for ${img.imageName}`
      );
      continue;
    }

    const results = await sendMultipleViolationsToOpenAI(croppedInputs);

    for (const result of results) {
      const detailIndex = result.detailIndex;

      if (typeof detailIndex !== "number" || !updatedDetails[detailIndex]) {
        console.warn("⚠️ Invalid detailIndex from OpenAI:", result);
        continue;
      }

      updatedDetails[detailIndex].isValid = result.isValid;
      updatedDetails[detailIndex].violationName = result.violationName;
    }

    img.details = updatedDetails;
    await img.save();

    await Promise.all(croppedInputs.map((f) => fs.unlink(f.imagePath)));
    console.log(`✅ Processed: ${img.imageName}`);
  }

  console.log("🎉 All invalid violations processed.");
}
