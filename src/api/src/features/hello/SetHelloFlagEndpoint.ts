import type { FastifyInstance } from "fastify";
import { featureFlagEditor } from "../../hosting/feature-flags.js";
import { sendProblem, validationProblem } from "../../hosting/problem.js";
import type { Services } from "../../hosting/services.js";
import { helloFlagResponse, setHelloFlag } from "./hello-flag.js";
import { HelloFeatures } from "./hello-features.js";

export function endpoint(services: Services) {
  const editor = services.get(featureFlagEditor);

  return async function register(app: FastifyInstance): Promise<void> {
    app.put("/hello/flag", async (request, reply) => {
      const parsed = setHelloFlag.safeParse(request.body);
      if (!parsed.success) {
        return sendProblem(reply, validationProblem(parsed.error));
      }

      if (!editor.canUpdate) {
        return sendProblem(reply, {
          type: "https://tools.ietf.org/html/rfc9110#section-15.5.10",
          title: "Conflict",
          status: 409,
          detail: "App Configuration is not connected, so the flag cannot be changed.",
        }, 409);
      }

      await editor.setEnabled(HelloFeatures.newWorld, parsed.data.enabled);
      return helloFlagResponse(parsed.data.enabled, true);
    });
  };
}
