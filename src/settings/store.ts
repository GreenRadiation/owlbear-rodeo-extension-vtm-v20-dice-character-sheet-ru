import create from "zustand";

import { getPluginId } from "../plugin/getPluginId";

export type SheetPlacement = "below" | "right";

/**
 * The tray has two modes, small and large, that the player switches between
 * with a button: small to look at the map, large to look at the dice.
 * Every mode has its own set of these settings.
 */
export interface TrayMode {
  /** Height of the tray in pixels */
  height: number;
  /**
   * Width of the tray relative to the tray of the original Owlbear Rodeo
   * roller which is half as wide as it is high. 2 is a square tray.
   */
  width: number;
  /** Size of the dice relative to the dice of the original Owlbear Rodeo roller */
  diceScale: number;
  /** Where the character sheet goes when it is open */
  sheetPlacement: SheetPlacement;
  /** Height in pixels of a sheet that is below the tray, it is as wide as the tray */
  sheetHeight: number;
  /** Width in pixels of a sheet that is to the right of the tray, it is as high as the tray */
  sheetWidth: number;
  /** How many columns the sheet is laid out in, its text scales to fit them */
  sheetColumns: number;
}

/**
 * Personal settings of the player, kept in the browser.
 * All the windows of the extension share them: a change made in the tray
 * reaches the window with the previews through the `storage` event.
 */
export interface Settings {
  small: TrayMode;
  large: TrayMode;
  /** Which of the two modes of the tray is in use */
  trayLarge: boolean;
  /** Height of the previews of the rolls of other players, 0 turns the previews off */
  previewHeight: number;
  /** If the character sheet is shown */
  sheetOpen: boolean;
}

export const MIN_TRAY_HEIGHT = 360;
export const MAX_TRAY_HEIGHT = 1200;
export const TRAY_HEIGHT_STEP = 20;

export const MIN_TRAY_WIDTH = 1;
export const MAX_TRAY_WIDTH = 2;
export const TRAY_WIDTH_STEP = 0.1;
/** The width of a tray when nothing else is known, for example of a player who hasn't rolled yet */
export const DEFAULT_TRAY_WIDTH = 1.2;

/** The choices for the height of the previews, the first one turns them off */
export const PREVIEW_HEIGHTS = [0, 180, 240, 300, 380, 460, 560, 680];

export const MIN_SHEET_SIZE = 200;
export const MAX_SHEET_SIZE = 1000;
export const SHEET_SIZE_STEP = 20;
export const MIN_SHEET_COLUMNS = 1;
export const MAX_SHEET_COLUMNS = 3;

export const MIN_DICE_SCALE = 0.7;
export const MAX_DICE_SCALE = 1.1;
export const DICE_SCALE_STEP = 0.05;

export const defaultSettings: Settings = {
  // A small tray with the sheet right below it makes a narrow strip at the side of the screen
  small: {
    height: 560,
    width: DEFAULT_TRAY_WIDTH,
    diceScale: 1,
    sheetPlacement: "below",
    sheetHeight: 460,
    sheetWidth: 420,
    sheetColumns: 3,
  },
  // A large tray takes the whole height of the screen so its sheet goes to the side
  large: {
    height: 880,
    width: DEFAULT_TRAY_WIDTH,
    diceScale: 1,
    sheetPlacement: "right",
    sheetHeight: 460,
    sheetWidth: 440,
    sheetColumns: 2,
  },
  trayLarge: false,
  previewHeight: 300,
  sheetOpen: false,
};

const STORAGE_KEY = getPluginId("settings");

function clamp(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

type Stored = Record<string, unknown>;

function asRecord(value: unknown): Stored {
  return typeof value === "object" && value !== null ? (value as Stored) : {};
}

function sanitizeMode(value: unknown, fallback: TrayMode): TrayMode {
  const stored = asRecord(value);
  return {
    height: clamp(
      stored.height,
      MIN_TRAY_HEIGHT,
      MAX_TRAY_HEIGHT,
      fallback.height
    ),
    width: clamp(stored.width, MIN_TRAY_WIDTH, MAX_TRAY_WIDTH, fallback.width),
    diceScale: clamp(
      stored.diceScale,
      MIN_DICE_SCALE,
      MAX_DICE_SCALE,
      fallback.diceScale
    ),
    sheetPlacement:
      stored.sheetPlacement === "below" || stored.sheetPlacement === "right"
        ? stored.sheetPlacement
        : fallback.sheetPlacement,
    sheetHeight: clamp(
      stored.sheetHeight,
      MIN_SHEET_SIZE,
      MAX_SHEET_SIZE,
      fallback.sheetHeight
    ),
    sheetWidth: clamp(
      stored.sheetWidth,
      MIN_SHEET_SIZE,
      MAX_SHEET_SIZE,
      fallback.sheetWidth
    ),
    sheetColumns: Math.round(
      clamp(
        stored.sheetColumns,
        MIN_SHEET_COLUMNS,
        MAX_SHEET_COLUMNS,
        fallback.sheetColumns
      )
    ),
  };
}

/** Make valid settings out of anything that was stored */
export function sanitizeSettings(value: unknown): Settings {
  const stored = asRecord(value);
  const d = defaultSettings;
  // The first version of the settings had one size of dice and only the heights of the modes
  const legacy = (height: unknown, fallback: TrayMode) => ({
    ...fallback,
    height,
    diceScale: stored.diceScale,
  });
  return {
    small: sanitizeMode(
      stored.small ?? legacy(stored.trayHeightSmall, d.small),
      d.small
    ),
    large: sanitizeMode(
      stored.large ?? legacy(stored.trayHeightLarge, d.large),
      d.large
    ),
    trayLarge:
      typeof stored.trayLarge === "boolean" ? stored.trayLarge : d.trayLarge,
    previewHeight: PREVIEW_HEIGHTS.includes(stored.previewHeight as number)
      ? (stored.previewHeight as number)
      : d.previewHeight,
    sheetOpen:
      typeof stored.sheetOpen === "boolean" ? stored.sheetOpen : d.sheetOpen,
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
  /** Change the settings of one of the modes of the tray */
  changeMode: (large: boolean, update: Partial<TrayMode>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: load(),
  changeSettings(update) {
    const settings = sanitizeSettings({ ...get().settings, ...update });
    save(settings);
    set({ settings });
  },
  changeMode(large, update) {
    const current = get().settings;
    get().changeSettings(
      large
        ? { large: { ...current.large, ...update } }
        : { small: { ...current.small, ...update } }
    );
  },
  resetSettings() {
    // Stay in the current mode of the tray, everything else goes back
    const settings = {
      ...defaultSettings,
      trayLarge: get().settings.trayLarge,
      sheetOpen: get().settings.sheetOpen,
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

/** The settings of the mode the tray is in */
export function getTrayMode(settings: Settings): TrayMode {
  return settings.trayLarge ? settings.large : settings.small;
}

/** Width in pixels of a tray of a given height */
export function getTrayPixelWidth(height: number, width: number) {
  return Math.round((height / 2) * width);
}
