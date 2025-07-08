import Fastify from "fastify";
import dotenv from "dotenv";
dotenv.config();
import cors from "./plugins/cors";
import helmet from "./plugins/helmet";
import swagger from "./plugins/swagger";
import socket from "./plugins/socket";
import rateLimit from "./plugins/rate-limit";
import multipart from "./plugins/multipart";
import staticFiles from "./plugins/static";
import compress from "./plugins/compress";
import sensible from "./plugins/sensible";
import arena from "./dashboard/arena";
import mainRouter from "./routes"; // assuming routes/index.ts exists
import { setupJobs } from "./jobs/setupJobs";
import { validateAndUpdateViolations } from "./helpers/validateAndUpdateViolations";

export const buildApp = () =>
  Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    },
  });

export const registerAppPlugins = async (app: ReturnType<typeof buildApp>) => {
  await app.register(cors);
  await app.register(helmet);
  await app.register(swagger);
  await app.register(socket);
  await app.register(rateLimit);
  await app.register(multipart);
  await app.register(staticFiles);
  await app.register(compress);
  await app.register(sensible);
  await app.register(arena);

  await setupJobs();
  validateAndUpdateViolations();

  // ✅ Add CORP headers specifically for /images/* routes
  app.addHook("onSend", (request, reply, payload, done) => {
    const url = request.raw.url || "";

    if (url.startsWith("/images/")) {
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    }

    done();
  });

  // ✅ Register routes
  await app.register(mainRouter); // this brings in /users and /images
};
