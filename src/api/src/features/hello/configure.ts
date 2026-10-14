import { connectionString } from "../../hosting/configuration.js";
import { featureFlags, openFeatureFlags } from "../../hosting/feature-flags.js";
import type { Services } from "../../hosting/services.js";
import { HelloFeatures } from "./hello-features.js";

const connectionName = "appconfiguration";

export function configure(services: Services): void {
  if (services.has(featureFlags)) {
    return;
  }

  services.set(featureFlags, openFeatureFlags(connectionString(connectionName), HelloFeatures.newWorld));
}
