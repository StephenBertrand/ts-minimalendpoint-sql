export interface ServiceMap {
}

export class Services {
  private readonly values = new Map<symbol, unknown>();

  has(key: keyof ServiceMap): boolean {
    return this.values.has(key as symbol);
  }

  set<K extends keyof ServiceMap>(key: K, value: ServiceMap[K]): void {
    this.values.set(key as symbol, value);
  }

  get<K extends keyof ServiceMap>(key: K): ServiceMap[K] {
    const value = this.values.get(key as symbol);
    if (value === undefined) {
      throw new Error("A feature service was used before its configure ran.");
    }

    return value as ServiceMap[K];
  }
}
