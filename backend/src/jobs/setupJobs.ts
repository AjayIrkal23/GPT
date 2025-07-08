import { processUnlabeledImages } from "helpers/processUnlabeledImages";
import { imageProcessingWorker } from "../workers/imageProcessingWorker";
import { setupImageProcessingRepeatJob } from "./imageProcessingScheduler";
import { validateAndUpdateViolations } from "../helpers/validateAndUpdateViolations";

export async function setupJobs() {
  // ✅ Run once on startup
  processUnlabeledImages()
    .then((res) => {
      console.log("🚀 Safety AI Scan Completed on Startup:", res);
    })
    .catch((err) => {
      console.error("❌ Error running processUnlabeledImages:", err);
    });

  validateAndUpdateViolations()
    .then((res) => {
      console.log("🚀 Validation Completed on Startup:");
    })
    .catch((err) => {
      console.error("❌ Error running processUnlabeledImages:", err);
    });

  await setupImageProcessingRepeatJob(); // ⏱ schedule it
  imageProcessingWorker; // 👷‍♂️ run worker
}
