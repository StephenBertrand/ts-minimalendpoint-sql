import { connectionString } from "../../hosting/configuration";
import { openPool } from "../../hosting/sql-connection";
import type { Services } from "../../hosting/services";
import { applySchema } from "./schema";
import { TodoStore, todoStore } from "./todo-store";

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
