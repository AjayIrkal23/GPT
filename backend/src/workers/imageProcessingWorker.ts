// workers/imageProcessingWorker.ts
import { Worker } from "bullmq";
import { processUnlabeledImages } from "../helpers/processUnlabeledImages";
import { redis } from "../utils/redis";

export const imageProcessingWorker = new Worker(
  "image-processing",
  async () => {
    const result = await processUnlabeledImages();
    console.log("📥 Worker processed images:", result);
  },
  { connection: redis }
);
