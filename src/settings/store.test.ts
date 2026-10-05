import { describe, expect, it, vi } from "vitest";

// The store reads the browser storage when it is created
vi.stubGlobal("localStorage", {
  getItem: () => null,
  setItem: () => {},
});
vi.stubGlobal("window", { addEventListener: () => {} });

const {
  defaultSettings,
  getModelPixelWidth,
  getTrayMode,
  getTrayModelWidth,
  getTrayPixelWidth,
  isTrayLandscape,
  sanitizeSettings,
} = await import("./store");

describe("settings", () => {
  it("falls back to the defaults", () => {
    expect(sanitizeSettings(undefined)).toEqual(defaultSettings);
    expect(sanitizeSettings("nonsense")).toEqual(defaultSettings);
    expect(sanitizeSettings({ small: { diceScale: "big" } })).toEqual(
      defaultSettings
    );
  });

  it("keeps valid values and clamps the rest", () => {
    const settings = sanitizeSettings({
      version: 2,
      small: {
        height: 400,
        width: 1,
        diceScale: 0.1,
        sheetPlacement: "right",
        sheetHeight: 5,
        sheetWidth: 300,
        sheetColumns: 2.4,
      },
      large: {
        height: 5000,
        width: 9,
        diceScale: 1.05,
        sheetPlacement: "sideways",
        sheetColumns: 7,
      },
      trayLarge: true,
      previewHeight: 240,
      previewLastOnly: true,
      hiddenPreviews: ["a", 7, "b"],
      sheetOpen: true,
      tenSymbol: "0",
      oneSymbol: "nonsense",
    });
    expect(settings).toEqual({
      small: {
        height: 400,
        width: 1,
        diceScale: 0.7,
        sheetPlacement: "right",
        sheetHeight: 200,
        sheetWidth: 300,
        sheetColumns: 2,
      },
      large: {
        ...defaultSettings.large,
        height: 1200,
        width: 2,
        diceScale: 1.05,
        sheetColumns: 3,
      },
      trayLarge: true,
      previewHeight: 240,
      previewLastOnly: true,
      hiddenPreviews: ["a", "b"],
      sheetOpen: true,
      tenSymbol: "0",
      oneSymbol: defaultSettings.oneSymbol,
    });
  });

  it("fills in the settings a mode is missing", () => {
    const settings = sanitizeSettings({ small: { height: 400 } });
    expect(settings.small).toEqual({ ...defaultSettings.small, height: 400 });
    expect(settings.large).toEqual(defaultSettings.large);
  });

  it("converts the width of the tray from the settings of the previous version", () => {
    // The width used to be relative to the original tray: 2 was a square
    const old = sanitizeSettings({
      small: { height: 400, width: 1.2 },
      large: { height: 900, width: 2 },
    });
    expect(old.small.width).toBeCloseTo(0.6);
    expect(old.large.width).toBe(1);
    // Settings of the current version are left alone
    const current = sanitizeSettings({ version: 2, small: { width: 1.2 } });
    expect(current.small.width).toBe(1.2);
  });

  it("reads the settings of the first version", () => {
    const settings = sanitizeSettings({
      trayHeightSmall: 600,
      trayHeightLarge: 1100,
      trayLarge: true,
      previewHeight: 460,
      diceScale: 0.8,
    });
    expect(settings.small).toEqual({
      ...defaultSettings.small,
      height: 600,
      diceScale: 0.8,
    });
    expect(settings.large).toEqual({
      ...defaultSettings.large,
      height: 1100,
      diceScale: 0.8,
    });
    expect(settings.trayLarge).toBe(true);
    expect(settings.previewHeight).toBe(460);
  });

  it("only accepts the listed preview heights", () => {
    expect(sanitizeSettings({ previewHeight: 0 }).previewHeight).toBe(0);
    expect(sanitizeSettings({ previewHeight: 680 }).previewHeight).toBe(680);
    expect(sanitizeSettings({ previewHeight: 123 }).previewHeight).toBe(
      defaultSettings.previewHeight
    );
  });

  it("picks the settings of the current mode", () => {
    expect(getTrayMode({ ...defaultSettings, trayLarge: true })).toBe(
      defaultSettings.large
    );
    expect(getTrayMode({ ...defaultSettings, trayLarge: false })).toBe(
      defaultSettings.small
    );
  });

  it("sizes the tray by its width relative to its height", () => {
    expect(getTrayPixelWidth(700, 0.5)).toBe(350);
    expect(getTrayPixelWidth(700, 1)).toBe(700);
    expect(getTrayPixelWidth(700, 1.5)).toBe(1050);
  });

  it("lays a tray wider than a square on its side", () => {
    expect(isTrayLandscape(0.6)).toBe(false);
    expect(isTrayLandscape(1)).toBe(false);
    expect(isTrayLandscape(1.5)).toBe(true);
    // The model is the original tray at 1 and a square at 2
    expect(getTrayModelWidth(0.5)).toBe(1);
    expect(getTrayModelWidth(0.6)).toBeCloseTo(1.2);
    expect(getTrayModelWidth(1)).toBe(2);
    // On its side a tray twice as wide as high is the original tray again
    expect(getTrayModelWidth(2)).toBe(1);
    // Previews show the model upright
    expect(getModelPixelWidth(300, 1)).toBe(150);
    expect(getModelPixelWidth(300, 2)).toBe(300);
  });
});
