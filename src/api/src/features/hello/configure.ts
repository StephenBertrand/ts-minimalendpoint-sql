import { connectionString } from "../../hosting/configuration";
import { featureFlags, openFeatureFlags } from "../../hosting/feature-flags";
import type { Services } from "../../hosting/services";
import { HelloFeatures } from "./hello-features";

const connectionName = "appconfiguration";

export function configure(services: Services): void {
  if (services.has(featureFlags)) {
    return;
  }

  services.set(featureFlags, openFeatureFlags(connectionString(connectionName), HelloFeatures.newWorld));
}
