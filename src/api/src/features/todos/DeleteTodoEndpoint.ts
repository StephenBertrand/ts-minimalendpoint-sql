import type { FastifyInstance } from "fastify";
import type { Services } from "../../hosting/services.js";
import { todoStore } from "./todo-store.js";

export function endpoint(services: Services) {
  const store = services.get(todoStore);

  return async function register(app: FastifyInstance): Promise<void> {
    app.delete<{ Params: { id: string } }>("/todos/:id", async (request, reply) => {
      const removed = await store.delete(Number(request.params.id));
      return removed ? reply.code(204).send() : reply.code(404).send();
    });
  };
}
