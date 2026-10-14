import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sql from "mssql";

const migrationId = "0001_create_todos";
const lockResource = "ts-minimalendpoint-sql-schema";

export async function applySchema(pool: sql.ConnectionPool): Promise<void> {
  const transaction = pool.transaction();
  await transaction.begin();
  try {
    await acquireLock(transaction);
    await ensureMigrationsTable(transaction);
    if (!(await migrationApplied(transaction))) {
      const script = await readFile(migrationPath(), "utf8");
      await transaction.request().query(script);
      await transaction.request()
        .input("id", migrationId)
        .query("INSERT INTO dbo.SchemaMigrations (Id, AppliedUtc) VALUES (@id, SYSUTCDATETIME())");
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function acquireLock(transaction: sql.Transaction): Promise<void> {
  const result = await transaction.request().query(`
    DECLARE @result int;
    EXEC @result = sp_getapplock
      @Resource = N'${lockResource}',
      @LockMode = N'Exclusive',
      @LockOwner = N'Transaction',
      @LockTimeout = 15000;
    SELECT @result AS result;
  `);
  const code = Number(result.recordset[0]?.result);
  if (code < 0) {
    throw new Error(`Could not lock the schema for migration (${code}).`);
  }
}

async function ensureMigrationsTable(transaction: sql.Transaction): Promise<void> {
  await transaction.request().query(`
    IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
    CREATE TABLE dbo.SchemaMigrations (
      Id nvarchar(100) NOT NULL CONSTRAINT PK_SchemaMigrations PRIMARY KEY,
      AppliedUtc datetimeoffset NOT NULL
    );
  `);
}

async function migrationApplied(transaction: sql.Transaction): Promise<boolean> {
  const applied = await transaction.request()
    .input("id", migrationId)
    .query("SELECT 1 AS applied FROM dbo.SchemaMigrations WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id");
  return applied.recordset.length > 0;
}

function migrationPath(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations", `${migrationId}.sql`);
}
