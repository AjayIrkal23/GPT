import fp from "fastify-plugin";
import multipart from "@fastify/multipart";

export default fp(async (fastify) => {
  fastify.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 1024, // ✅ 1 GB (or set to Infinity if needed)
    },
  });
});
