import { beforeEach, describe, expect, it } from "vitest";
import { appWithTodos, clearTodos } from "./todos-fixture";

describe("todos", () => {
  beforeEach(async () => {
    await clearTodos();
  });

  it("creates, lists, completes, and deletes a todo", async () => {
    const app = await appWithTodos();

    const empty = await app.inject({ method: "GET", url: "/todos" });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual([]);

    const created = await app.inject({
      method: "POST",
      url: "/todos",
      payload: { title: "Ship sample" },
    });
    expect(created.statusCode).toBe(201);
    const todo = created.json<{ id: number; title: string; isComplete: boolean }>();
    expect(todo.id).toBeGreaterThan(0);
    expect(todo.title).toBe("Ship sample");
    expect(todo.isComplete).toBe(false);
    expect(created.headers.location).toBe(`/todos/${todo.id}`);

    const listed = await app.inject({ method: "GET", url: "/todos" });
    expect(listed.json<{ id: number }[]>().some((row) => row.id === todo.id)).toBe(true);

    const updated = await app.inject({
      method: "PUT",
      url: `/todos/${todo.id}`,
      payload: { title: "Ship sample", isComplete: true },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json<{ isComplete: boolean }>().isComplete).toBe(true);

    const deleted = await app.inject({ method: "DELETE", url: `/todos/${todo.id}` });
    expect(deleted.statusCode).toBe(204);

    const missing = await app.inject({ method: "GET", url: `/todos/${todo.id}` });
    expect(missing.statusCode).toBe(404);
  });

  it("rejects a blank title before writing a row", async () => {
    const app = await appWithTodos();

    const rejected = await app.inject({
      method: "POST",
      url: "/todos",
      payload: { title: "   " },
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.headers["content-type"]).toContain("application/problem+json");
    expect(rejected.json<{ errors: { title: string[] } }>().errors.title[0]).toBe("Title is required.");

    const listed = await app.inject({ method: "GET", url: "/todos" });
    expect(listed.json()).toEqual([]);
  });

  it("rejects a title longer than 200 characters", async () => {
    const app = await appWithTodos();

    const rejected = await app.inject({
      method: "POST",
      url: "/todos",
      payload: { title: "a".repeat(201) },
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json<{ errors: { title: string[] } }>().errors.title.length).toBeGreaterThan(0);
  });
});
