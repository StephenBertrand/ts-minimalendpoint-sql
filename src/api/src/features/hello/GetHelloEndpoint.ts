import type { FastifyInstance } from "fastify";
import { featureFlags, type FeatureFlags } from "../../hosting/feature-flags";
import type { Services } from "../../hosting/services";
import { HelloFeatures } from "./hello-features";
import type { HelloResponse } from "./hello-response";

export function endpoint(services: Services) {
  const flags = services.get<FeatureFlags>(featureFlags);

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
