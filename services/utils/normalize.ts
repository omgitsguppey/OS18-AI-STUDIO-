// services/utils/normalize.ts

export function asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value;
  
    if (value && typeof value === "object") {
      return Object.values(value as Record<string, T>);
    }
  
    return [];
  }
  