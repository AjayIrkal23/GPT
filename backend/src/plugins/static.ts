import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import path from "path";

export default fp(async (fastify) => {
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../../images"), // Serve files from uploads folder
    prefix: "/images/", // Accessible at http://localhost:3000/images/*
    decorateReply: false, // Optional: disables reply.sendFile()
  });
});
