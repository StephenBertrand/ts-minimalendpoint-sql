import { buildApp, type App } from "../src/hosting/app";
import { todoStore } from "../src/features/todos/todo-store";

let app: App | undefined;

export async function appWithTodos(): Promise<App> {
  app ??= await buildApp({ logger: false });
  return app;
}

export async function clearTodos(): Promise<void> {
  const current = app ?? await appWithTodos();
  const store = current.services.get(todoStore);
  for (const todo of await store.list()) {
    await store.delete(todo.id);
  }
}
