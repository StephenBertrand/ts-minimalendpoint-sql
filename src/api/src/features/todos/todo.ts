import { z } from "zod";

export const title = z.string().trim().min(1, "Title is required.").max(200, "Title must be 200 characters or fewer.");

export const createTodo = z.object({ title });

export const updateTodo = z.object({
  title,
  isComplete: z.boolean(),
});

export type TodoResponse = {
  id: number;
  title: string;
  isComplete: boolean;
  createdUtc: string;
};

export type TodoRow = {
  id: number;
  title: string;
  isComplete: boolean | number;
  createdUtc: Date | string;
};

export function toTodoResponse(row: TodoRow): TodoResponse {
  return {
    id: row.id,
    title: row.title,
    isComplete: Boolean(row.isComplete),
    createdUtc: new Date(row.createdUtc).toISOString(),
  };
}
