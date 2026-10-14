import { z } from "zod";
import { HelloFeatures } from "./hello-features.js";

export const setHelloFlag = z.object({
  enabled: z.boolean(),
});

export interface HelloFlagResponse {
  featureFlag: string;
  enabled: boolean;
  canUpdate: boolean;
}

export function helloFlagResponse(enabled: boolean, canUpdate: boolean): HelloFlagResponse {
  return {
    featureFlag: HelloFeatures.newWorld,
    enabled,
    canUpdate,
  };
}
