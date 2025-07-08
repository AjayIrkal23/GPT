import { FastifyInstance } from "fastify";
import userRoutes from "./user.routes";
import imageRoutes from "./image.routes";
import anotatedImageRoutes from "./anotatedImages.route";
import { boundingBoxRoutes } from "./boundingBox.route";

export default async function mainRouter(fastify: FastifyInstance) {
  fastify.register(userRoutes, { prefix: "/users" });
  fastify.register(imageRoutes, { prefix: "/images" }); // ✅ route: /images/upload-zip
  fastify.register(anotatedImageRoutes); // ✅ route: /images/upload-zip
  fastify.register(boundingBoxRoutes); // ✅ route: /images/upload-zip

  // ✅ Homepage test route
  fastify.get("/test", async (req, reply) => {
    return {
      message: "Welcome to the Safety AI Assistant API",
    };
  });
}
