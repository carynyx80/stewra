import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { corsOriginPattern, corsOrigins } from "./env.js";
import { HttpError } from "./errors.js";
import { publicRoutes } from "./routes/public.js";
import { orgRoutes } from "./routes/orgs.js";
import { workRoutes } from "./routes/work.js";
import { commerceRoutes } from "./routes/commerce.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" }, bodyLimit: 2 * 1024 * 1024, trustProxy: true });

  await app.register(cors, {
    origin: (origin, cb) => {
      // non-browser clients send no Origin header
      if (!origin || corsOrigins.includes(origin) || corsOrigins.includes("*")) return cb(null, true);
      // optional pattern for this project's preview deployments, e.g. ^https://stewra-[a-z0-9-]+-carynyx1\.vercel\.app$
      if (corsOriginPattern && corsOriginPattern.test(origin)) return cb(null, true);
      cb(new Error("Origin not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.code, message: err.message });
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation_error", message: err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return reply.code(404).send({ error: "not_found", message: "Not found" });
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.code(status).send({ error: "request_error", message: (err as Error).message });
    req.log.error(err);
    return reply.code(500).send({ error: "internal_error", message: "Something went wrong on our side." });
  });

  app.get("/", async () => ({ name: "Stewra API", version: "v1", docs: "/v1/meta" }));
  await app.register(
    async (v1) => {
      await v1.register(publicRoutes);
      await v1.register(orgRoutes);
      await v1.register(workRoutes);
      await v1.register(commerceRoutes);
    },
    { prefix: "/v1" },
  );
  return app;
}
