import { LucideIcon } from 'lucide-react';

export enum AppID {
  STORE = 'store',
  TIPS = 'tips',
  SETTINGS = 'settings',
  CALCULATOR = 'calculator',
  WEATHER = 'weather',
  NOTES = 'notes',
  PHOTOS = 'photos',
  DRAMA = 'drama',
  SELL_IT = 'sell_it',
  LYRICS_AI = 'lyrics_ai',
  ALBUMS_AI = 'albums_ai',
  LINK_FLIPPER = 'link_flipper',
  CAPTIONS = 'captions_ai',
  PASSWORDS = 'passwords',
  MARKUP_AI = 'markup_ai',
  CONVERT_AI = 'convert_ai',
  CONTENT_AI = 'content_ai',
  ANALYTICS_AI = 'analytics_ai',
  CAREER_AI = 'career_ai',
  TRENDS_AI = 'trends_ai',
  WALLPAPER_AI = 'wallpaper_ai',
  GET_FAMOUS = 'get_famous',
  PRIORITY_AI = 'priority_ai',
  BRAND_KIT_AI = 'brand_kit_ai',
  VIRAL_PLAN_AI = 'viral_plan_ai',
  AI_PLAYGROUND = 'ai_playground',
  PLAYLIST_AI = 'playlist_ai',
  ACHIEVEMENTS = 'achievements',
  NSFW_AI = 'nsfw_ai',
  TRAP_AI = 'trap_ai',
  OPERATOR = 'operator',
  SPEECH_AI = 'speech_ai',
  SHORTS_STUDIO = 'shorts_studio'
}

export interface AppConfig {
  id: AppID;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
  isSystem?: boolean; // Cannot be uninstalled
}

export interface AppState {
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
}

// --- SYSTEM INTELLIGENCE & TELEMETRY TYPES ---
// Shared between Client (Collector) and Server (Dreamer)

export type MemoryScope = 'Global' | 'Creative' | 'Business' | 'Utility';

export interface LearnedFact {
  content: string;
  scope: MemoryScope;
  confidence: number;
  source: 'implicit_edit' | 'explicit_save' | 'clipboard' | 'dwell';
  timestamp: number;
}

export interface Insight {
  id: string;
  type: 'pattern' | 'anomaly' | 'behavior';
  message: string;
  confidence: number;
  timestamp: number;
}

export type TelemetryEventType =
  | 'open'
  | 'close'
  | 'navigation'
  | 'click'
  | 'input'
  | 'error'
  | 'performance'
  | 'save'
  | 'delete'
  | 'generate'
  | 'regenerate'
  | 'download'
  | 'copy'
  | 'dwell'
  | 'install'
  | 'import'
  | 'export'
  | 'submit'
  | 'success';

export interface TelemetryEvent {
  uid?: string;
  sessionId: string;
  appId: string;
  context: string;
  eventType: TelemetryEventType;
  label: string;
  timestamp: number;
  meta?: Record<string, unknown> | null;
}

export interface TelemetryEventInput {
  appId: string;
  context: string;
  eventType: TelemetryEventType;
  label?: string;
  meta?: Record<string, unknown> | null;
}

export interface SystemPolicy {
  tokenPolicy: {
    defaultDailyTokens: number;
    defaultPerMinute: number;
    killSwitchEnabled: boolean;
    tiers: Record<string, { dailyTokens: number; perMinute: number }>;
  };
  modelMapping: Record<string, string>;
  updatedAt?: number;
}
