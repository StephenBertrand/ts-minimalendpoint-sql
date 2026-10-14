import sql from "mssql";
import { toTodoResponse, type TodoResponse, type TodoRow } from "./todo.js";

export const todoStore: unique symbol = Symbol("todoStore");

declare module "../../hosting/services.js" {
  interface ServiceMap {
    [todoStore]: TodoStore;
  }
}

const selectedColumns = "Id AS id, Title AS title, IsComplete AS isComplete, CreatedUtc AS createdUtc";
const insertedColumns = "INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.IsComplete AS isComplete, INSERTED.CreatedUtc AS createdUtc";

export class TodoStore {
  constructor(private readonly pool: sql.ConnectionPool) {}

  async list(): Promise<TodoResponse[]> {
    const result = await this.pool.request().query<TodoRow>(`
      SELECT ${selectedColumns}
      FROM dbo.Todos
      ORDER BY CreatedUtc DESC
    `);
    return result.recordset.map(toTodoResponse);
  }

  async find(id: number): Promise<TodoResponse | undefined> {
    const result = await this.pool.request()
      .input("id", sql.Int, id)
      .query<TodoRow>(`SELECT ${selectedColumns} FROM dbo.Todos WHERE Id = @id`);
    const row = result.recordset[0];
    return row ? toTodoResponse(row) : undefined;
  }

  async create(title: string): Promise<TodoResponse> {
    const result = await this.pool.request()
      .input("title", sql.NVarChar(200), title)
      .input("createdUtc", sql.DateTimeOffset, new Date())
      .query<TodoRow>(`
        INSERT INTO dbo.Todos (Title, IsComplete, CreatedUtc)
        OUTPUT ${insertedColumns}
        VALUES (@title, 0, @createdUtc)
      `);
    return toTodoResponse(result.recordset[0]);
  }

  async update(id: number, title: string, isComplete: boolean): Promise<TodoResponse | undefined> {
    const result = await this.pool.request()
      .input("id", sql.Int, id)
      .input("title", sql.NVarChar(200), title)
      .input("isComplete", sql.Bit, isComplete)
      .query<TodoRow>(`
        UPDATE dbo.Todos
        SET Title = @title, IsComplete = @isComplete
        OUTPUT ${insertedColumns}
        WHERE Id = @id
      `);
    const row = result.recordset[0];
    return row ? toTodoResponse(row) : undefined;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM dbo.Todos WHERE Id = @id");
    return (result.rowsAffected[0] ?? 0) > 0;
  }
}
