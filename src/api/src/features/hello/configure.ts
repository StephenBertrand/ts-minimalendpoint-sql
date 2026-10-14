import { connectionString } from "../../hosting/configuration.js";
import { featureFlagEditor, featureFlags, openFeatureFlagEditor, openFeatureFlags } from "../../hosting/feature-flags.js";
import type { Services } from "../../hosting/services.js";
import { HelloFeatures } from "./hello-features.js";

const connectionName = "appconfiguration";

export function configure(services: Services): void {
  const connection = connectionString(connectionName);
  if (!services.has(featureFlags)) {
    services.set(featureFlags, openFeatureFlags(connection, HelloFeatures.newWorld));
  }

  if (!services.has(featureFlagEditor)) {
    services.set(featureFlagEditor, openFeatureFlagEditor(connection));
  }
}
