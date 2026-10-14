import type { FastifyInstance } from "fastify";
import type { Services } from "../../hosting/services.js";
import { todoStore } from "./todo-store.js";

export function endpoint(services: Services) {
  const store = services.get(todoStore);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/todos", async () => store.list());
  };
}
