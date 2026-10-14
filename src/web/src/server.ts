import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

const apiBase = process.env.services__api__http__0 ?? process.env.services__api__https__0;
if (!apiBase) {
  throw new Error("services__api__http__0 is missing. The AppHost injects it.");
}

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "Healthy" }));

app.route({
  method: ["GET", "POST", "PUT", "DELETE"],
  url: "/api/*",
  handler: async (request, reply) => {
    const suffix = request.url.slice("/api".length) || "/";
    const target = new URL(suffix, apiBase.endsWith("/") ? apiBase : `${apiBase}/`);
    const method = request.method;
    const headers = new Headers();
    const sendsBody = method !== "GET" && method !== "HEAD" && request.body !== undefined && request.body !== null;
    if (sendsBody) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(target, {
      method,
      headers,
      body: sendsBody ? JSON.stringify(request.body) : undefined,
    });

    reply.code(response.status);
    const location = response.headers.get("location");
    if (location?.startsWith("/")) {
      reply.header("location", `/api${location}`);
    }

    const type = response.headers.get("content-type");
    if (type) {
      reply.type(type);
    }

    const text = await response.text();
    return text.length === 0 ? reply.send() : reply.send(text);
  },
});

const wwwroot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../wwwroot");
await app.register(fastifyStatic, {
  root: wwwroot,
  cacheControl: false,
  setHeaders(res) {
    res.setHeader("Cache-Control", "no-cache");
  },
});

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
