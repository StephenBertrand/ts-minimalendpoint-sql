const connectionPrefix = "ConnectionStrings__";

export function connectionString(name: string): string | undefined {
  const value = process.env[`${connectionPrefix}${name}`]?.trim();
  return value ? value : undefined;
}
