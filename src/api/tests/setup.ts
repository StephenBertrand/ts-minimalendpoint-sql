import { readFile } from "node:fs/promises";
import { connectionFile } from "./connection-file";

const connection = (await readFile(connectionFile, "utf8")).trim();
process.env.ConnectionStrings__todos = connection;
