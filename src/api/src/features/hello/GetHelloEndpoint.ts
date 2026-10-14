import type { FastifyInstance } from "fastify";
import { featureFlags } from "../../hosting/feature-flags.js";
import type { Services } from "../../hosting/services.js";
import { HelloFeatures } from "./hello-features.js";
import type { HelloResponse } from "./hello-response.js";

export function endpoint(services: Services) {
  const flags = services.get(featureFlags);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/hello", async (): Promise<HelloResponse> => {
      const enabled = await flags.isEnabled(HelloFeatures.newWorld);
      return {
        message: enabled ? "Hello New World" : "Hello World",
        featureFlag: HelloFeatures.newWorld,
        featureEnabled: enabled,
      };
    });
  };
}
