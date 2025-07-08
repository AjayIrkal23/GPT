// schedulers/imageProcessingScheduler.ts
import { imageProcessingQueue } from "../queues/imageProcessingQueue";

export async function setupImageProcessingRepeatJob() {
  await imageProcessingQueue.add(
    "process-unlabeled-images",
    {},
    {
      repeat: { every: 1000 * 60 * 60 * 1 }, // every 4 hours
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  console.log("⏳ Repeat job scheduled for every 4 hours.");
}
