import fp from "fastify-plugin";
import cors from "@fastify/cors";

export default fp(async (fastify) => {
  const origins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  fastify.register(cors, {
    origin: origins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
});