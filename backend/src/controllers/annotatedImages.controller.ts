import { FastifyRequest, FastifyReply } from "fastify";
import { AnnotatedImageModel } from "../models/anotated.model";
import { ImageResultModel } from "../models/ImageResult.model";
import { validateAndUpdateViolations } from "../helpers/validateAndUpdateViolations";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GetUniqueQuery {
  employeeId: string;
}

interface GetByValidationQuery {
  isValid: "true" | "false" | "null";
  employeeId: string;
}

interface AnnotationDetail {
  violationName: string;
  description: string;
  boundingBox: BoundingBox;
  isValid?: boolean | null; // Optional, defaults to null in schema
}

interface AnnotatedImageInput {
  employeeId: string;
  imageName: string;
  imagePath: string;
  imageSize: {
    width: number;
    height: number;
  };
  details: AnnotationDetail[];
}
export const createAnnotatedImages = async (
  req: FastifyRequest<{ Body: AnnotatedImageInput[] }>,
  reply: FastifyReply
) => {
  try {
    const images = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "Request body must be a non-empty array of annotated images.",
      });
    }

    let created = 0;
    let skipped = 0;

    for (const img of images) {
      const { employeeId, imageName, imagePath, imageSize, details } = img;

      if (!employeeId || !imageName || !imagePath || !imageSize || !details) {
        continue; // Skip incomplete entries
      }

      const exists = await AnnotatedImageModel.exists({ imageName, imagePath });

      if (exists) {
        skipped++;
        continue;
      }

      await AnnotatedImageModel.create({
        employeeId,
        imageName,
        imagePath,
        imageSize,
        details: details.map((detail) => ({
          violationName: detail.violationName,
          description: detail.description,
          boundingBox: detail.boundingBox,
          isValid: detail.isValid ?? null, // Default to null if not provided
        })),
      });

      created++;
    }

    validateAndUpdateViolations()
      .then((res) => {
        console.log("🚀 Validation Completed on Startup:");
      })
      .catch((err) => {
        console.error("❌ Error running processUnlabeledImages:", err);
      });

    return reply.send({
      success: true,
      created,
      skipped,
      message: `${created} image(s) saved, ${skipped} skipped (already exists).`,
    });
  } catch (err) {
    console.error("Error creating annotated images:", err);
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: (err as Error).message,
    });
  }
};

export const getUniqueAnnotatedImages = async (
  req: FastifyRequest<{ Querystring: GetUniqueQuery }>,
  reply: FastifyReply
) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return reply.status(400).send({
        success: false,
        message: "employeeId is required",
      });
    }

    const BATCH_SIZE = 60;
    const MAX_UNIQUE = 30;

    const uniqueImages: any[] = [];
    const existingSet = new Set<string>();
    let skip = 0;
    let exhausted = false;

    while (uniqueImages.length < MAX_UNIQUE && !exhausted) {
      const batch = await ImageResultModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(BATCH_SIZE);

      if (!batch.length) {
        exhausted = true;
        break;
      }

      const imageKeyMap = batch.map((img) => ({
        imageName: img.imageName,
        imagePath: img.imagePath,
      }));

      const existingAnnotated = await AnnotatedImageModel.find({
        employeeId,
        $or: imageKeyMap.map(({ imageName, imagePath }) => ({
          imageName,
          imagePath,
        })),
        "details.0": { $exists: true },
      });

      existingAnnotated.forEach((doc) => {
        existingSet.add(`${doc.imageName}___${doc.imagePath}`);
      });

      for (const img of batch) {
        const key = `${img.imageName}___${img.imagePath}`;
        if (!existingSet.has(key)) {
          uniqueImages.push(img);
          existingSet.add(key);
        }

        if (uniqueImages.length >= MAX_UNIQUE) break;
      }

      skip += BATCH_SIZE;
    }

    return reply.send({
      success: true,
      message:
        uniqueImages.length === 0
          ? "No unique images found."
          : `Found ${uniqueImages.length} unique images.`,
      data: uniqueImages,
    });
  } catch (error) {
    console.error("❌ Error fetching unique annotated images:", error);
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const getAnnotatedImagesByValidation = async (
  req: FastifyRequest<{ Querystring: GetByValidationQuery }>,
  reply: FastifyReply
) => {
  try {
    const { isValid, employeeId } = req.query;

    if (!employeeId) {
      return reply.status(400).send({
        success: false,
        message: "Query param 'employeeId' is required.",
      });
    }

    // Build match filter
    const matchStage: any = { employeeId };

    if (isValid === "true") {
      matchStage["details.isValid"] = true;
    } else if (isValid === "false") {
      matchStage["details.isValid"] = false;
    } else if (isValid === "null") {
      matchStage["details.isValid"] = null;
    } else {
      return reply.status(400).send({
        success: false,
        message: "Query param 'isValid' must be one of: true, false, null.",
      });
    }

    // Get filtered data
    const images = await AnnotatedImageModel.find(matchStage);

    // Count correct and wrong for this employee
    const [validatedCorrect, validatedWrong] = await Promise.all([
      AnnotatedImageModel.countDocuments({
        employeeId,
        "details.isValid": true,
      }),
      AnnotatedImageModel.countDocuments({
        employeeId,
        "details.isValid": false,
      }),
    ]);

    return reply.send({
      success: true,
      count: images.length,
      validatedCorrect,
      validatedWrong,
      data: images,
    });
  } catch (error) {
    console.error("❌ Error fetching by validation:", error);
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
