export interface NormalizedSystemSettings {
  dimLevel: number;
  reducedMotion: boolean;
  nightShift: boolean;
  showFPS: boolean;
  wallpaperDimming: boolean;
  textSize: number;
  boldText: boolean;
  debugBorders: boolean;
}

const DEFAULT_SYSTEM_SETTINGS: NormalizedSystemSettings = {
  dimLevel: 0,
  reducedMotion: false,
  nightShift: false,
  showFPS: false,
  wallpaperDimming: false,
  textSize: 1,
  boldText: false,
  debugBorders: false
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const hasKey = (record: Record<string, unknown>, key: string) => (
  Object.prototype.hasOwnProperty.call(record, key)
);

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toBoolean = (value: unknown, fallback: boolean) => (
  typeof value === 'boolean' ? value : fallback
);

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const resolveDimLevel = (record: Record<string, unknown>) => {
  if (hasKey(record, 'brightness')) {
    const brightness = clamp(toNumber(record.brightness, 100), 0, 100);
    return clamp(100 - brightness, 0, 100);
  }
  if (hasKey(record, 'dimLevel')) {
    return clamp(toNumber(record.dimLevel, DEFAULT_SYSTEM_SETTINGS.dimLevel), 0, 100);
  }
  return undefined;
};

export const normalizeSettingsUpdate = (raw: unknown): Partial<NormalizedSystemSettings> => {
  const record = isRecord(raw) ? raw : {};
  const update: Partial<NormalizedSystemSettings> = {};
  const dimLevel = resolveDimLevel(record);
  if (dimLevel !== undefined) update.dimLevel = dimLevel;
  if (hasKey(record, 'reducedMotion')) update.reducedMotion = toBoolean(record.reducedMotion, DEFAULT_SYSTEM_SETTINGS.reducedMotion);
  if (hasKey(record, 'nightShift')) update.nightShift = toBoolean(record.nightShift, DEFAULT_SYSTEM_SETTINGS.nightShift);
  if (hasKey(record, 'showFPS')) update.showFPS = toBoolean(record.showFPS, DEFAULT_SYSTEM_SETTINGS.showFPS);
  if (hasKey(record, 'wallpaperDimming')) update.wallpaperDimming = toBoolean(record.wallpaperDimming, DEFAULT_SYSTEM_SETTINGS.wallpaperDimming);
  if (hasKey(record, 'textSize')) {
    update.textSize = clamp(toNumber(record.textSize, DEFAULT_SYSTEM_SETTINGS.textSize), 0.5, 2);
  }
  if (hasKey(record, 'boldText')) update.boldText = toBoolean(record.boldText, DEFAULT_SYSTEM_SETTINGS.boldText);
  if (hasKey(record, 'debugBorders')) update.debugBorders = toBoolean(record.debugBorders, DEFAULT_SYSTEM_SETTINGS.debugBorders);
  return update;
};

export const normalizeSettings = (raw: unknown): NormalizedSystemSettings => ({
  ...DEFAULT_SYSTEM_SETTINGS,
  ...normalizeSettingsUpdate(raw)
});

export interface NormalizeWallpaperSelectionInput {
  storedId: unknown;
  storedCustom: unknown;
  wallpapers: Array<{ id: string }>;
  fallbackId: string;
}

export interface NormalizedWallpaperSelection {
  wallpaperId: string;
  customImage: string | null;
}

export const normalizeWallpaperSelection = ({
  storedId,
  storedCustom,
  wallpapers,
  fallbackId
}: NormalizeWallpaperSelectionInput): NormalizedWallpaperSelection => {
  const customRecord = isRecord(storedCustom) ? storedCustom : null;
  const customImage = customRecord && typeof customRecord.image === 'string' && customRecord.image.trim() !== ''
    ? customRecord.image
    : null;
  if (customImage) {
    const customId = customRecord && typeof customRecord.id === 'string' && customRecord.id.trim() !== ''
      ? customRecord.id
      : fallbackId;
    return { wallpaperId: customId, customImage };
  }
  const candidateId = typeof storedId === 'string' ? storedId : '';
  const isValid = wallpapers.some(wallpaper => wallpaper.id === candidateId);
  return { wallpaperId: isValid ? candidateId : fallbackId, customImage: null };
};

export interface NormalizedWallpaperUpdate {
  wallpaperId?: string;
  wallpaperImage?: string | null;
}

export const normalizeWallpaperUpdate = (
  raw: unknown,
  wallpapers: Array<{ id: string }>,
  fallbackId: string
): NormalizedWallpaperUpdate => {
  const record = isRecord(raw) ? raw : {};
  const update: NormalizedWallpaperUpdate = {};
  if (hasKey(record, 'wallpaperImage')) {
    const image = record.wallpaperImage;
    update.wallpaperImage = typeof image === 'string' && image.trim() !== '' ? image : null;
  }
  if (hasKey(record, 'wallpaperId')) {
    const rawId = typeof record.wallpaperId === 'string' ? record.wallpaperId : '';
    if (update.wallpaperImage) {
      update.wallpaperId = rawId.trim() !== '' ? rawId : fallbackId;
    } else {
      update.wallpaperId = wallpapers.some(wallpaper => wallpaper.id === rawId) ? rawId : fallbackId;
    }
  }
  return update;
};
