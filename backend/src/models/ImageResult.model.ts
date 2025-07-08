import mongoose, { Document, Schema } from "mongoose";

export interface IImageResult extends Document {
  imagePath: string;
  imageName: string;
  violationDetails:
    | {
        name: string;
        description: string;
        severity: any;
      }[]
    | null;
}

const ViolationSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const ImageResultSchema = new Schema<IImageResult>(
  {
    imagePath: { type: String, required: true },
    imageName: { type: String, required: true },
    violationDetails: {
      type: [ViolationSchema], // ✅ array of subdocuments
      default: null,
    },
  },
  { timestamps: true }
);

export const ImageResultModel = mongoose.model<IImageResult>(
  "ImageResult",
  ImageResultSchema
);
