// queues/imageProcessingQueue.ts
import { Queue } from "bullmq";
import { redis } from "../utils/redis";

export const imageProcessingQueue = new Queue("image-processing", {
  connection: redis,
});
