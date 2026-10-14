import path from "node:path";
import { fileURLToPath } from "node:url";

export const connectionFile = path.join(path.dirname(fileURLToPath(import.meta.url)), ".sql-connection");
