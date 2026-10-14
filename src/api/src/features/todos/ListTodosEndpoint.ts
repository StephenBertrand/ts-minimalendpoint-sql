import type { FastifyInstance } from "fastify";
import type { Services } from "../../hosting/services";
import { TodoStore, todoStore } from "./todo-store";

export function endpoint(services: Services) {
  const store = services.get<TodoStore>(todoStore);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/todos", async () => store.list());
  };
}
