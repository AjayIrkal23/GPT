import mongoose, { Document, Schema } from "mongoose";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationDetail {
  violationName: string;
  description: string;
  boundingBox: BoundingBox;
  isValid: boolean | null; // ✅ added isValid
}

export interface AnnotatedImage extends Document {
  employeeId: string; // ✅ added employeeId
  imageName: string;
  imagePath: string;
  imageSize: {
    width: number;
    height: number;
  };
  details: AnnotationDetail[];
}

const BoundingBoxSchema = new Schema<BoundingBox>(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const AnnotationDetailSchema = new Schema<AnnotationDetail>(
  {
    violationName: { type: String, required: true },
    description: { type: String, default: "" },
    boundingBox: { type: BoundingBoxSchema, required: true },
    isValid: { type: Boolean, default: null }, // ✅ default to null
  },
  { _id: false }
);

const AnnotatedImageSchema = new Schema<AnnotatedImage>(
  {
    employeeId: { type: String, required: true }, // ✅ included here
    imageName: { type: String, required: true },
    imagePath: { type: String, required: true },
    imageSize: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    details: {
      type: [AnnotationDetailSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const AnnotatedImageModel = mongoose.model<AnnotatedImage>(
  "AnnotatedImage",
  AnnotatedImageSchema
);
