import { AppConfigurationClient } from "@azure/app-configuration";
import { DefaultAzureCredential } from "@azure/identity";

const refreshIntervalMs = 5_000;
const sentinelKey = "Demo:Sentinel";

export const featureFlags: unique symbol = Symbol("featureFlags");

export interface FeatureFlags {
  isEnabled(name: string): Promise<boolean>;
}

declare module "./services.js" {
  interface ServiceMap {
    [featureFlags]: FeatureFlags;
  }
}

export const flagsOff: FeatureFlags = {
  isEnabled: async () => false,
};

export function openFeatureFlags(connection: string | undefined, flagName: string): FeatureFlags {
  if (!connection) {
    return flagsOff;
  }

  const endpoint = part(connection, "Endpoint");
  if (!endpoint) {
    throw new Error("App Configuration connection has no Endpoint.");
  }

  // The emulator is plain HTTP and rejects the SDK's HMAC handshake.
  const reader = new URL(endpoint).protocol === "http:"
    ? new EmulatorReader(endpoint)
    : new AppConfigurationReader(clientFor(connection, endpoint));
  return new RefreshingFlags(reader, flagName);
}

interface SettingReader {
  read(key: string): Promise<string | undefined>;
}

class RefreshingFlags implements FeatureFlags {
  private snapshot = { sentinel: "", enabled: false, at: 0 };
  private pending: Promise<void> | undefined;

  constructor(private readonly reader: SettingReader, private readonly flagName: string) {}

  async isEnabled(name: string): Promise<boolean> {
    if (name !== this.flagName) {
      return false;
    }

    if (Date.now() - this.snapshot.at >= refreshIntervalMs) {
      this.pending ??= this.refresh().finally(() => {
        this.pending = undefined;
      });
      await this.pending;
    }

    return this.snapshot.enabled;
  }

  private async refresh(): Promise<void> {
    try {
      const sentinel = (await this.reader.read(sentinelKey)) ?? "";
      if (sentinel === this.snapshot.sentinel && this.snapshot.at !== 0) {
        this.snapshot.at = Date.now();
        return;
      }

      const document = await this.reader.read(`.appconfig.featureflag/${this.flagName}`);
      const enabled = document ? readEnabled(document) : false;
      this.snapshot = { sentinel, enabled, at: Date.now() };
    } catch {
      this.snapshot.at = Date.now();
    }
  }
}

class AppConfigurationReader implements SettingReader {
  constructor(private readonly client: AppConfigurationClient) {}

  async read(key: string): Promise<string | undefined> {
    try {
      const setting = await this.client.getConfigurationSetting({ key });
      return setting.value ?? undefined;
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }

      throw error;
    }
  }
}

class EmulatorReader implements SettingReader {
  constructor(private readonly endpoint: string) {}

  async read(key: string): Promise<string | undefined> {
    const url = new URL(`/kv/${encodeURIComponent(key)}`, this.endpoint);
    url.searchParams.set("api-version", "2023-11-01");
    const response = await fetch(url);
    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`App Configuration emulator returned ${response.status} for ${key}.`);
    }

    const body = await response.json() as { value?: string };
    return body.value;
  }
}

function clientFor(connection: string, endpoint: string): AppConfigurationClient {
  const id = part(connection, "Id");
  const secret = part(connection, "Secret");
  if (id && secret) {
    return new AppConfigurationClient(connection);
  }

  return new AppConfigurationClient(endpoint, new DefaultAzureCredential());
}

function part(connection: string, name: string): string | undefined {
  for (const segment of connection.split(";")) {
    const separator = segment.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    if (segment.slice(0, separator).trim().toLowerCase() === name.toLowerCase()) {
      const value = segment.slice(separator + 1).trim();
      return value || undefined;
    }
  }

  return undefined;
}

function readEnabled(document: string): boolean {
  const parsed = JSON.parse(document) as { enabled?: boolean };
  return parsed.enabled === true;
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 404;
}
