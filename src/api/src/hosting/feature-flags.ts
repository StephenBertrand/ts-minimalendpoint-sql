import { AppConfigurationClient } from "@azure/app-configuration";
import { DefaultAzureCredential } from "@azure/identity";

const refreshIntervalMs = 5_000;
const sentinelKey = "Demo:Sentinel";

export const featureFlags: unique symbol = Symbol("featureFlags");

export interface FeatureFlags {
  isEnabled(name: string): Promise<boolean>;
}

export const featureFlagEditor: unique symbol = Symbol("featureFlagEditor");

export interface FeatureFlagEditor {
  readonly canUpdate: boolean;
  readEnabled(name: string): Promise<boolean>;
  setEnabled(name: string, enabled: boolean): Promise<void>;
}

declare module "./services.js" {
  interface ServiceMap {
    [featureFlags]: FeatureFlags;
    [featureFlagEditor]: FeatureFlagEditor;
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

interface SettingStore {
  read(key: string): Promise<string | undefined>;
  write(key: string, value: string, contentType?: string): Promise<void>;
}

class RefreshingFlags implements FeatureFlags {
  private snapshot = { sentinel: "", enabled: false, at: 0 };
  private pending: Promise<void> | undefined;

  constructor(private readonly reader: SettingStore, private readonly flagName: string) {}

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

class AppConfigurationReader implements SettingStore {
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

  async write(key: string, value: string, contentType?: string): Promise<void> {
    await this.client.setConfigurationSetting({ key, value, contentType });
  }
}

class EmulatorReader implements SettingStore {
  constructor(private readonly endpoint: string) {}

  async read(key: string): Promise<string | undefined> {
    const response = await fetch(this.keyUrl(key));
    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`App Configuration emulator returned ${response.status} for ${key}.`);
    }

    const body = await response.json() as { value?: string };
    return body.value;
  }

  async write(key: string, value: string, contentType?: string): Promise<void> {
    const body: { value: string; content_type?: string } = { value };
    if (contentType) {
      body.content_type = contentType;
    }

    const response = await fetch(this.keyUrl(key), {
      method: "PUT",
      headers: { "content-type": "application/vnd.microsoft.appconfig.kv+json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`App Configuration emulator returned ${response.status} for ${key}.`);
    }
  }

  private keyUrl(key: string): URL {
    const url = new URL(`/kv/${encodeURIComponent(key)}`, this.endpoint);
    url.searchParams.set("api-version", "2023-11-01");
    return url;
  }
}

const flagContentType = "application/vnd.microsoft.appconfig.ff+json;charset=utf-8";

const editorLocked: FeatureFlagEditor = {
  canUpdate: false,
  readEnabled: async () => false,
  setEnabled: async () => {
    throw new Error("App Configuration is not connected.");
  },
};

export function openFeatureFlagEditor(connection: string | undefined): FeatureFlagEditor {
  if (!connection) {
    return editorLocked;
  }

  const endpoint = part(connection, "Endpoint");
  if (!endpoint) {
    throw new Error("App Configuration connection has no Endpoint.");
  }

  const store = new URL(endpoint).protocol === "http:"
    ? new EmulatorReader(endpoint)
    : new AppConfigurationReader(clientFor(connection, endpoint));
  return new ConfigurationFlagEditor(store);
}

class ConfigurationFlagEditor implements FeatureFlagEditor {
  readonly canUpdate = true;

  constructor(private readonly store: SettingStore) {}

  async readEnabled(name: string): Promise<boolean> {
    const document = await this.store.read(flagKey(name));
    return document ? readEnabled(document) : false;
  }

  async setEnabled(name: string, enabled: boolean): Promise<void> {
    const key = flagKey(name);
    const current = await this.store.read(key);
    const document = current ? JSON.parse(current) as Record<string, unknown> : {
      id: name,
      conditions: { client_filters: [] },
    };
    document.id = name;
    document.enabled = enabled;
    await this.store.write(key, JSON.stringify(document), flagContentType);

    const sentinel = await this.store.read(sentinelKey);
    await this.store.write(sentinelKey, nextSentinel(sentinel));
  }
}

function flagKey(name: string): string {
  return `.appconfig.featureflag/${name}`;
}

function nextSentinel(current: string | undefined): string {
  return current !== undefined && /^-?\d+$/.test(current) ? String(Number(current) + 1) : "1";
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
