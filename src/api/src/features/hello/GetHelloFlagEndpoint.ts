import type { FastifyInstance } from "fastify";
import { featureFlagEditor } from "../../hosting/feature-flags.js";
import type { Services } from "../../hosting/services.js";
import { helloFlagResponse, type HelloFlagResponse } from "./hello-flag.js";
import { HelloFeatures } from "./hello-features.js";

export function endpoint(services: Services) {
  const editor = services.get(featureFlagEditor);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/hello/flag", async (): Promise<HelloFlagResponse> => {
      const enabled = await editor.readEnabled(HelloFeatures.newWorld);
      return helloFlagResponse(enabled, editor.canUpdate);
    });
  };
}
