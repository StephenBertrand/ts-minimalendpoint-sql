import type { FastifyInstance } from "fastify";
import { sendProblem, validationProblem } from "../../hosting/problem.js";
import type { Services } from "../../hosting/services.js";
import { createTodo } from "./todo.js";
import { todoStore } from "./todo-store.js";

export function endpoint(services: Services) {
  const store = services.get(todoStore);

  return async function register(app: FastifyInstance): Promise<void> {
    app.post("/todos", async (request, reply) => {
      const parsed = createTodo.safeParse(request.body);
      if (!parsed.success) {
        return sendProblem(reply, validationProblem(parsed.error));
      }

      const todo = await store.create(parsed.data.title);
      return reply.code(201).header("location", `/todos/${todo.id}`).send(todo);
    });
  };
}
