import { FastifyRequest, FastifyReply } from "fastify";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { ImageResultModel } from "../models/ImageResult.model";
import { processUnlabeledImages } from "../helpers/processUnlabeledImages";

const UPLOAD_DIR = path.join(__dirname, "../../images");

export const uploadZipAndExtractImages = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const data = await req.file();

    if (!data || !data.filename.endsWith(".zip")) {
      return reply
        .status(400)
        .send({ success: false, message: "Only .zip files are allowed" });
    }

    const buffer = await data.toBuffer();
    const zip = new AdmZip(buffer);

    // Optional: create unique subfolder for each zip
    const extractSubDir = Date.now().toString();
    const extractPath = path.join(UPLOAD_DIR, extractSubDir);
    fs.mkdirSync(extractPath, { recursive: true });

    zip.extractAllTo(extractPath, true);

    const imageFiles = fs
      .readdirSync(extractPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file));

    const saved = [];

    for (const image of imageFiles) {
      const relativePath = `images/${extractSubDir}/${image}`; // Public path

      const imageDoc = new ImageResultModel({
        imagePath: relativePath, // Save web-accessible path
        imageName: image,
        violationDetails: null,
      });

      await imageDoc.save();
      saved.push(imageDoc);
    }

    // ✅ Run once on startup
    processUnlabeledImages()
      .then((res) => {
        console.log("🚀 Safety AI Scan Completed on Startup:", res);
      })
      .catch((err) => {
        console.error("❌ Error running processUnlabeledImages:", err);
      });

    return reply.send({
      success: true,
      message: `${saved.length} images processed and saved`,
      data: saved,
    });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ success: false, message: "Upload failed" });
  }
};

export const getImageStats = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Fetch all image documents
    const images = await ImageResultModel.find({}, "imagePath");

    // Extract timestamps from imagePath (e.g., "images/1751805852207/file.jpeg")
    const zipFolders = new Set<string>();

    for (const img of images) {
      const match = img.imagePath.match(/^images\/(\d+)\//);
      if (match) {
        zipFolders.add(match[1]);
      }
    }

    return reply.send({
      success: true,
      zipFileCount: zipFolders.size,
      imageCount: images.length,
      zipFolders: Array.from(zipFolders),
    });
  } catch (err) {
    console.error("Failed to fetch image stats:", err);
    return reply.status(500).send({
      success: false,
      message: "Failed to fetch image statistics",
    });
  }
};

export const getPaginatedImages = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const page = parseInt((req.query as any).page) || 1;
    const limit = parseInt((req.query as any).limit) || 30;
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      ImageResultModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ImageResultModel.countDocuments(),
    ]);

    return reply.send({
      success: true,
      data: images,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in paginated fetch:", err);
    return reply
      .status(500)
      .send({ success: false, message: "Failed to fetch images" });
  }
};
