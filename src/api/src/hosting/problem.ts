import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function validationProblem(error: ZodError): Record<string, unknown> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    errors[key] = [...(errors[key] ?? []), issue.message];
  }

  return {
    type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    title: "One or more validation errors occurred.",
    status: 400,
    errors,
  };
}

export function sendProblem(reply: FastifyReply, body: Record<string, unknown>, status = 400): FastifyReply {
  return reply.code(status).type("application/problem+json").send(body);
}

export function problemErrorHandler(error: unknown, _request: FastifyRequest, reply: FastifyReply): FastifyReply {
  if (error instanceof ZodError) {
    return sendProblem(reply, validationProblem(error));
  }

  throw error;
}
