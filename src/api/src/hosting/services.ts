export class Services {
  private readonly values = new Map<symbol, unknown>();

  has(key: symbol): boolean {
    return this.values.has(key);
  }

  set<T>(key: symbol, value: T): void {
    this.values.set(key, value);
  }

  get<T>(key: symbol): T {
    const value = this.values.get(key);
    if (value === undefined) {
      throw new Error("A feature service was used before its configure ran.");
    }

    return value as T;
  }
}
