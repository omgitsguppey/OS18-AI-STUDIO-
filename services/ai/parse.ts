type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseJson = (text: string | null | undefined): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("AI JSON parse failed", error);
    return null;
  }
};

export const parseJsonObject = (text: string | null | undefined): JsonRecord | null => {
  const parsed = parseJson(text);
  return isRecord(parsed) ? parsed : null;
};

export const parseJsonArray = (text: string | null | undefined): unknown[] => {
  const parsed = parseJson(text);
  return Array.isArray(parsed) ? parsed : [];
};

export const getString = (record: JsonRecord, key: string, fallback = ""): string => {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
};

export const getNumber = (record: JsonRecord, key: string, fallback = 0): number => {
  const value = record[key];
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
};

export const getBoolean = (record: JsonRecord, key: string, fallback = false): boolean => {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
};

export const getArray = (record: JsonRecord, key: string): unknown[] => {
  const value = record[key];
  return Array.isArray(value) ? value : [];
};

export const getStringArray = (record: JsonRecord, key: string): string[] => {
  return getArray(record, key).filter((item): item is string => typeof item === "string");
};

export const mapStringArray = (items: unknown[]): string[] =>
  items.filter((item): item is string => typeof item === "string");

export const mapRecordArray = (items: unknown[]): JsonRecord[] =>
  items.filter(isRecord);
