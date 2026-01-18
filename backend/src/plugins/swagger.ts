import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export default fp(async (fastify) => {
  fastify.register(swagger, {
    swagger: {
      info: {
        title: "Ordering API",
        description: "Restaurant API",
        version: "1.0.0"
      },
      consumes: ["application/json"],
      produces: ["application/json"],
    },
  });

  fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    }
  });
});