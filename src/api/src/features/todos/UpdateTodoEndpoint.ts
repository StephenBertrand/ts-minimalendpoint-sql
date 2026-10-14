import type { FastifyInstance } from "fastify";
import { sendProblem, validationProblem } from "../../hosting/problem";
import type { Services } from "../../hosting/services";
import { updateTodo } from "./todo";
import { TodoStore, todoStore } from "./todo-store";

export function endpoint(services: Services) {
  const store = services.get<TodoStore>(todoStore);

  return async function register(app: FastifyInstance): Promise<void> {
    app.put<{ Params: { id: string } }>("/todos/:id", async (request, reply) => {
      const parsed = updateTodo.safeParse(request.body);
      if (!parsed.success) {
        return sendProblem(reply, validationProblem(parsed.error));
      }

      const todo = await store.update(Number(request.params.id), parsed.data.title, parsed.data.isComplete);
      return todo ?? reply.code(404).send();
    });
  };
}
