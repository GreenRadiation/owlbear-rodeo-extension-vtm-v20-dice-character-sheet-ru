import { useMemo } from "react";
import create from "zustand";

import { getPluginId } from "../plugin/getPluginId";
import {
  DEFAULT_SYMBOLS,
  ONE_SYMBOLS,
  Symbols,
  TEN_SYMBOLS,
} from "../v20/roll";

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
   * Width of the tray relative to its height: 1 is a square tray,
   * 0.5 is the tray of the original Owlbear Rodeo roller.
   * A tray wider than a square is the tray of the inverse width lying on its side.
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
  /** Only show the preview of the player who rolled last */
  previewLastOnly: boolean;
  /** Ids of the players whose rolls don't get a preview */
  hiddenPreviews: string[];
  /** If the character sheet is shown */
  sheetOpen: boolean;
  /**
   * Everything of the extension is out of the way of the map: its window is
   * shrunk to a single button and the previews are hidden
   */
  collapsed: boolean;
  /** Ids of the sections of the character sheet that are folded */
  foldedSections: string[];
  /** How a ten and a one are written, see TEN_SYMBOLS and ONE_SYMBOLS */
  tenSymbol: string;
  oneSymbol: string;
}

export const MIN_TRAY_HEIGHT = 360;
export const MAX_TRAY_HEIGHT = 1200;
export const TRAY_HEIGHT_STEP = 20;

export const MIN_TRAY_WIDTH = 0.5;
export const MAX_TRAY_WIDTH = 2;
export const TRAY_WIDTH_STEP = 0.1;
const DEFAULT_TRAY_WIDTH = 0.6;

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

/** The most players that can be kept out of the previews */
const MAX_HIDDEN_PREVIEWS = 30;
/** More than the sheet has sections */
const MAX_FOLDED_SECTIONS = 20;

/** The defaults were picked by the author of the extension for his group */
export const defaultSettings: Settings = {
  // An upright tray with a sheet in one column below it: a narrow strip at the side of the screen
  small: {
    height: 500,
    width: DEFAULT_TRAY_WIDTH,
    diceScale: 1,
    sheetPlacement: "below",
    sheetHeight: 600,
    sheetWidth: 420,
    sheetColumns: 1,
  },
  // A tray on its side with a sheet in three columns below it
  large: {
    height: 360,
    width: 1.8,
    diceScale: 1,
    sheetPlacement: "below",
    sheetHeight: 600,
    sheetWidth: 440,
    sheetColumns: 3,
  },
  trayLarge: false,
  previewHeight: 380,
  previewLastOnly: false,
  hiddenPreviews: [],
  sheetOpen: false,
  collapsed: false,
  foldedSections: [],
  tenSymbol: DEFAULT_SYMBOLS.ten,
  oneSymbol: DEFAULT_SYMBOLS.one,
};

/**
 * Version of the stored settings.
 * 1: the width of the tray was relative to the original tray, 2 was a square.
 * 2: the width of the tray is relative to its height, 1 is a square.
 */
const VERSION = 2;

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

/** Bring the settings stored by an older version of the extension up to date */
function migrate(stored: Stored): Stored {
  if (stored.version === VERSION) {
    return stored;
  }
  const migrated = { ...stored };
  for (const key of ["small", "large"]) {
    const mode = asRecord(stored[key]);
    if (typeof mode.width === "number") {
      migrated[key] = { ...mode, width: mode.width / 2 };
    }
  }
  return migrated;
}

/** Make valid settings out of anything that was stored */
export function sanitizeSettings(value: unknown): Settings {
  const stored = migrate(asRecord(value));
  const d = defaultSettings;
  // The very first settings had one size of dice and only the heights of the modes
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
    previewLastOnly:
      typeof stored.previewLastOnly === "boolean"
        ? stored.previewLastOnly
        : d.previewLastOnly,
    hiddenPreviews: Array.isArray(stored.hiddenPreviews)
      ? stored.hiddenPreviews
          .filter((id): id is string => typeof id === "string")
          .slice(0, MAX_HIDDEN_PREVIEWS)
      : d.hiddenPreviews,
    sheetOpen:
      typeof stored.sheetOpen === "boolean" ? stored.sheetOpen : d.sheetOpen,
    collapsed:
      typeof stored.collapsed === "boolean" ? stored.collapsed : d.collapsed,
    foldedSections: Array.isArray(stored.foldedSections)
      ? stored.foldedSections
          .filter((id): id is string => typeof id === "string")
          .slice(0, MAX_FOLDED_SECTIONS)
      : d.foldedSections,
    tenSymbol: TEN_SYMBOLS.includes(stored.tenSymbol as string)
      ? (stored.tenSymbol as string)
      : d.tenSymbol,
    oneSymbol: ONE_SYMBOLS.includes(stored.oneSymbol as string)
      ? (stored.oneSymbol as string)
      : d.oneSymbol,
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...settings, version: VERSION })
    );
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
    const settings = sanitizeSettings({
      ...get().settings,
      ...update,
      version: VERSION,
    });
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
  return Math.round(height * width);
}

/** A tray that is wider than it is high lies on its side */
export function isTrayLandscape(width: number) {
  return width > 1;
}

/**
 * The width of the 3D model of the tray for a width from the settings.
 * The model is always upright and its width is relative to the tray of the
 * original roller: 1 is the original tray, 2 is a square. This is the width
 * that goes into a roll (`DiceRoll.tray`) and that the physics use.
 * A tray lying on its side is the same model looked at with a turned camera.
 */
export function getTrayModelWidth(width: number) {
  return 2 * Math.min(width, 1 / width);
}

/** The width of the model of a tray when nothing else is known, for example of a player who hasn't rolled yet */
export const DEFAULT_TRAY_MODEL_WIDTH = getTrayModelWidth(DEFAULT_TRAY_WIDTH);

/** Width in pixels of an upright tray of a given height by the width of its model */
export function getModelPixelWidth(height: number, modelWidth: number) {
  return Math.round((height / 2) * modelWidth);
}

/** How the player wants tens and ones to be written */
export function useSymbols(): Symbols {
  const ten = useSettingsStore((state) => state.settings.tenSymbol);
  const one = useSettingsStore((state) => state.settings.oneSymbol);
  return useMemo(() => ({ ten, one }), [ten, one]);
}
