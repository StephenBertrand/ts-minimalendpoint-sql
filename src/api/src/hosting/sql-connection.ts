import net from "node:net";
import sql from "mssql";

export async function openPool(connectionString: string): Promise<sql.ConnectionPool> {
  const pool = new sql.ConnectionPool(toConfig(connectionString));
  await pool.connect();
  return pool;
}

function toConfig(connectionString: string): sql.config {
  const parts = readParts(connectionString);
  const server = parts.server ?? parts["data source"];
  if (!server) {
    throw new Error("SQL connection string has no Server.");
  }

  const [host, portText] = server.split(",");
  const database = parts.database ?? parts["initial catalog"];
  const authentication = parts.authentication?.toLowerCase();
  // Node will not use an IP address as a TLS server name. Aspire's local
  // SQL endpoint is 127.0.0.1, so that connection stays unencrypted.
  const encrypt = parts.encrypt?.toLowerCase() !== "false" && net.isIP(host) === 0;
  const config: sql.config = {
    server: host,
    port: portText ? Number(portText) : 1433,
    database,
    options: {
      encrypt,
      trustServerCertificate: parts.trustservercertificate?.toLowerCase() !== "false",
    },
  };

  if (authentication?.includes("active directory")) {
    config.authentication = {
      type: "azure-active-directory-default",
      options: {},
    } as sql.config["authentication"];
    return config;
  }

  config.user = parts["user id"] ?? parts.uid;
  config.password = parts.password ?? parts.pwd;
  return config;
}

function readParts(connectionString: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const segment of connectionString.split(";")) {
    const separator = segment.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = segment.slice(0, separator).trim().toLowerCase();
    parts[key] = segment.slice(separator + 1).trim();
  }

  return parts;
}
