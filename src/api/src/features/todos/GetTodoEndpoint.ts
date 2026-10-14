import type { FastifyInstance } from "fastify";
import type { Services } from "../../hosting/services.js";
import { todoStore } from "./todo-store.js";

export function endpoint(services: Services) {
  const store = services.get(todoStore);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get<{ Params: { id: string } }>("/todos/:id", async (request, reply) => {
      const todo = await store.find(Number(request.params.id));
      return todo ?? reply.code(404).send();
    });
  };
}
