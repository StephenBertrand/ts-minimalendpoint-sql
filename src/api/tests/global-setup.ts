import { writeFile } from "node:fs/promises";
import { MSSQLServerContainer, type StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import { openPool } from "../src/hosting/sql-connection";
import { connectionFile } from "./connection-file";

const image = "mcr.microsoft.com/mssql/server:2022-latest";
const password = "A_Str0ng_Passw0rd";

let container: StartedMSSQLServerContainer | undefined;

export async function setup(): Promise<void> {
  container = await new MSSQLServerContainer(image)
    .acceptLicense()
    .withPassword(password)
    .withStartupTimeout(180_000)
    .start();

  const master = container.getConnectionUri();
  const pool = await openPool(master);
  await pool.request().query("IF DB_ID(N'todos') IS NULL CREATE DATABASE todos");
  await pool.close();

  const todos = master.replace("Database=master", "Database=todos");
  await writeFile(connectionFile, todos, "utf8");
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
