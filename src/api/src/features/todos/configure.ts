import { connectionString } from "../../hosting/configuration.js";
import { openPool } from "../../hosting/sql-connection.js";
import type { Services } from "../../hosting/services.js";
import { applySchema } from "./schema.js";
import { TodoStore, todoStore } from "./todo-store.js";

const connectionName = "todos";

export async function configure(services: Services): Promise<void> {
  if (services.has(todoStore)) {
    return;
  }

  const connection = connectionString(connectionName);
  if (!connection) {
    throw new Error("ConnectionStrings__todos is missing. The AppHost injects it.");
  }

  const pool = await openPool(connection);
  await applySchema(pool);
  services.set(todoStore, new TodoStore(pool));
}
