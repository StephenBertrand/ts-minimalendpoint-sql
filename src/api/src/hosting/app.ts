import Fastify, { type FastifyInstance } from "fastify";
import { loadFeatures } from "./features.js";
import { problemErrorHandler } from "./problem.js";
import { Services } from "./services.js";

export type App = FastifyInstance & { services: Services };

export async function buildApp(options?: { logger?: boolean; services?: Services }): Promise<App> {
  const app = Fastify({ logger: options?.logger ?? true });
  const services = options?.services ?? new Services();
  app.setErrorHandler(problemErrorHandler);
  app.get("/health", async () => ({ status: "Healthy" }));
  await loadFeatures(app, services);
  return Object.assign(app, { services }) as App;
}
