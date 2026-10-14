import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type sql from "mssql";

const migrationId = "0001_create_todos";

export async function applySchema(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
    CREATE TABLE dbo.SchemaMigrations (
      Id nvarchar(100) NOT NULL CONSTRAINT PK_SchemaMigrations PRIMARY KEY,
      AppliedUtc datetimeoffset NOT NULL
    );
  `);

  const applied = await pool.request()
    .input("id", migrationId)
    .query("SELECT 1 AS applied FROM dbo.SchemaMigrations WHERE Id = @id");
  if (applied.recordset.length > 0) {
    return;
  }

  const script = await readFile(migrationPath(), "utf8");
  await pool.request().query(script);
  await pool.request()
    .input("id", migrationId)
    .query("INSERT INTO dbo.SchemaMigrations (Id, AppliedUtc) VALUES (@id, SYSUTCDATETIME())");
}

function migrationPath(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations", `${migrationId}.sql`);
}
