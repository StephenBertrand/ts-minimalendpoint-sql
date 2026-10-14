import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import type { Services } from "./services";

type ConfigureModule = {
  configure?: (services: Services) => Promise<void> | void;
};

type EndpointModule = {
  endpoint?: (services: Services) => (app: FastifyInstance) => Promise<void>;
};

const featuresDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../features");

// The host names no feature. A folder contributes configure.ts and files
// named *Endpoint.ts. Delete the folder and that feature is gone.
export async function loadFeatures(app: FastifyInstance, services: Services): Promise<void> {
  const files = await filesUnder(featuresDirectory);
  const configures = files.filter((file) => path.basename(file) === "configure.ts");
  const endpoints = files.filter((file) => path.basename(file).endsWith("Endpoint.ts"));

  for (const file of configures) {
    const loaded = await importFeature(file) as ConfigureModule;
    if (typeof loaded.configure !== "function") {
      throw new Error(`${display(file)} must export configure.`);
    }

    await loaded.configure(services);
  }

  for (const file of endpoints) {
    const loaded = await importFeature(file) as EndpointModule;
    if (typeof loaded.endpoint !== "function") {
      throw new Error(`${display(file)} must export endpoint.`);
    }

    await app.register(loaded.endpoint(services));
  }
}

async function importFeature(file: string): Promise<ConfigureModule & EndpointModule> {
  const parts = path.relative(featuresDirectory, file).replace(/\.ts$/, "").split(path.sep);
  if (parts.length === 2) {
    const [folder, name] = parts;
    return import(`../features/${folder}/${name}.ts`) as Promise<ConfigureModule & EndpointModule>;
  }

  if (parts.length === 3) {
    const [folder, useCase, name] = parts;
    return import(`../features/${folder}/${useCase}/${name}.ts`) as Promise<ConfigureModule & EndpointModule>;
  }

  throw new Error(`${display(file)} must sit in the feature folder, or one folder under it.`);
}

function display(file: string): string {
  return path.relative(featuresDirectory, file).split(path.sep).join("/");
}

async function filesUnder(directory: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === "migrations") {
      continue;
    }

    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...await filesUnder(full));
      continue;
    }

    if (entry.name.endsWith(".ts")) {
      found.push(full);
    }
  }

  return found;
}
