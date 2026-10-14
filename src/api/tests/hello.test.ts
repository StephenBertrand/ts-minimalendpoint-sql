import { describe, expect, it } from "vitest";
import { buildApp } from "../src/hosting/app";
import { featureFlags, type FeatureFlags } from "../src/hosting/feature-flags";
import { Services } from "../src/hosting/services";

describe("hello and ping", () => {
  it("says Hello World when the flag store is off", async () => {
    const app = await buildApp({ logger: false });
    const response = await app.inject({ method: "GET", url: "/hello" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Hello World",
      featureFlag: "HelloNewWorld",
      featureEnabled: false,
    });
  });

  it("says Hello New World when the flag is on", async () => {
    const services = new Services();
    const flags: FeatureFlags = { isEnabled: async () => true };
    services.set(featureFlags, flags);
    const app = await buildApp({ logger: false, services });
    const response = await app.inject({ method: "GET", url: "/hello" });

    expect(response.json()).toMatchObject({
      message: "Hello New World",
      featureEnabled: true,
    });
  });

  it("answers ping", async () => {
    const app = await buildApp({ logger: false });
    const response = await app.inject({ method: "GET", url: "/ping" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "pong" });
  });
});
