import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

export default fp(async (fastify) => {
  fastify.register(rateLimit, {
    max: 10000,
    timeWindow: "1 minute",
  });
});
