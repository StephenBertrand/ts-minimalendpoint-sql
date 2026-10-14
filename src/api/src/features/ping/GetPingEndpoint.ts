import type { FastifyInstance } from "fastify";
import type { Services } from "../../hosting/services.js";

export function endpoint(_services: Services) {
  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/ping", async () => ({ status: "pong" }));
  };
}
