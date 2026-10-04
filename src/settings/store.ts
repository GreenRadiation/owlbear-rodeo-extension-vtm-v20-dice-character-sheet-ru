import create from "zustand";

import { getPluginId } from "../plugin/getPluginId";

/**
 * Personal settings of the player, kept in the browser.
 * All the windows of the extension share them: a change made in the tray
 * reaches the window with the previews through the `storage` event.
 */
export interface Settings {
  /** Height of the window of the tray in its small and large sizes, the width follows the height */
  trayHeightSmall: number;
  trayHeightLarge: number;
  /** Which of the two sizes of the tray is in use */
  trayLarge: boolean;
  /** Height of the previews of the rolls of other players, 0 turns the previews off */
  previewHeight: number;
  /** Size of the dice relative to the dice of the original Owlbear Rodeo roller */
  diceScale: number;
}

export const MIN_TRAY_HEIGHT = 360;
export const MAX_TRAY_HEIGHT = 1200;
export const TRAY_HEIGHT_STEP = 20;

/** The choices for the height of the previews, the first one turns them off */
export const PREVIEW_HEIGHTS = [0, 180, 240, 300, 380, 460];

export const MIN_DICE_SCALE = 0.7;
export const MAX_DICE_SCALE = 1.1;
export const DICE_SCALE_STEP = 0.05;

export const defaultSettings: Settings = {
  trayHeightSmall: 520,
  trayHeightLarge: 760,
  trayLarge: true,
  previewHeight: 300,
  diceScale: 1,
};

const STORAGE_KEY = getPluginId("settings");

function clamp(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** Make valid settings out of anything that was stored */
export function sanitizeSettings(value: unknown): Settings {
  const stored = (
    typeof value === "object" && value !== null ? value : {}
  ) as Partial<Record<keyof Settings, unknown>>;
  const d = defaultSettings;
  return {
    trayHeightSmall: clamp(
      stored.trayHeightSmall,
      MIN_TRAY_HEIGHT,
      MAX_TRAY_HEIGHT,
      d.trayHeightSmall
    ),
    trayHeightLarge: clamp(
      stored.trayHeightLarge,
      MIN_TRAY_HEIGHT,
      MAX_TRAY_HEIGHT,
      d.trayHeightLarge
    ),
    trayLarge:
      typeof stored.trayLarge === "boolean" ? stored.trayLarge : d.trayLarge,
    previewHeight: PREVIEW_HEIGHTS.includes(stored.previewHeight as number)
      ? (stored.previewHeight as number)
      : d.previewHeight,
    diceScale: clamp(
      stored.diceScale,
      MIN_DICE_SCALE,
      MAX_DICE_SCALE,
      d.diceScale
    ),
  };
}

function load(): Settings {
  try {
    return sanitizeSettings(
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    );
  } catch {
    return defaultSettings;
  }
}

function save(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable, the settings just won't be remembered
  }
}

interface SettingsState {
  settings: Settings;
  changeSettings: (update: Partial<Settings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: load(),
  changeSettings(update) {
    const settings = sanitizeSettings({ ...get().settings, ...update });
    save(settings);
    set({ settings });
  },
  resetSettings() {
    // Keep the current size of the tray, only its dimensions go back
    const settings = {
      ...defaultSettings,
      trayLarge: get().settings.trayLarge,
    };
    save(settings);
    set({ settings });
  },
}));

// Pick up the changes made in another window of the extension
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    useSettingsStore.setState({ settings: load() });
  }
});

/** The height of the window of the tray for its current size */
export function getTrayHeight(settings: Settings) {
  return settings.trayLarge
    ? settings.trayHeightLarge
    : settings.trayHeightSmall;
}
