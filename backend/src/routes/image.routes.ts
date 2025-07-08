import { FastifyInstance } from "fastify";
import {
  uploadZipAndExtractImages,
  getImageStats,
  getPaginatedImages,
} from "../controllers/image.controller";

export default async function imageRoutes(fastify: FastifyInstance) {
  fastify.post("/upload-zip", uploadZipAndExtractImages);
  fastify.get("/stats", getImageStats); // new stats endpoint
  fastify.get("/paginated-images", getPaginatedImages); // ✅ new route
}
