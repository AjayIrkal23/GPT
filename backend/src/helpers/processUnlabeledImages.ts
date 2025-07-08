import { ImageResultModel } from "../models/ImageResult.model";
import { sendToOpenAiGetResult } from "./sendToOpenAiGetResult";

export async function processUnlabeledImages() {
  const images = await ImageResultModel.find({ violationDetails: null });

  for (const image of images) {
    const result: any = await sendToOpenAiGetResult(image.imagePath);

    if (result?.items && Array.isArray(result.items)) {
      image.violationDetails = result.items; // ✅ save the items array
      await image.save();
      console.log("✅ Updated:", image.imageName, result.items);
    } else {
      console.log("❌ No result for:", image.imageName);
    }
  }

  return { processed: images.length };
}
