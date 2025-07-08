import {
  createAnnotatedImages,
  getAnnotatedImagesByValidation,
  getUniqueAnnotatedImages,
} from "../controllers/annotatedImages.controller";
import { FastifyInstance } from "fastify";

export default async function validatedImageRoutes(app: FastifyInstance) {
  app.post("/anotatedImages/bulk", createAnnotatedImages);
  app.get("/startAnotate", getUniqueAnnotatedImages);
  app.get("/annotatedImages/by-validation", getAnnotatedImagesByValidation);
}
