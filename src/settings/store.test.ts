import { describe, expect, it, vi } from "vitest";

// The store reads the browser storage when it is created
vi.stubGlobal("localStorage", {
  getItem: () => null,
  setItem: () => {},
});
vi.stubGlobal("window", { addEventListener: () => {} });

const { defaultSettings, getTrayMode, getTrayPixelWidth, sanitizeSettings } =
  await import("./store");

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
      small: { height: 400, width: 1, diceScale: 0.1 },
      large: { height: 5000, width: 9, diceScale: 1.05 },
      trayLarge: true,
      previewHeight: 240,
    });
    expect(settings).toEqual({
      small: { height: 400, width: 1, diceScale: 0.7 },
      large: { height: 1200, width: 2, diceScale: 1.05 },
      trayLarge: true,
      previewHeight: 240,
    });
  });

  it("fills in the settings a mode is missing", () => {
    const settings = sanitizeSettings({ small: { height: 400 } });
    expect(settings.small).toEqual({ ...defaultSettings.small, height: 400 });
    expect(settings.large).toEqual(defaultSettings.large);
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

  it("makes the tray half as wide as it is high times its width", () => {
    expect(getTrayPixelWidth(700, 1)).toBe(350);
    expect(getTrayPixelWidth(700, 1.2)).toBe(420);
    expect(getTrayPixelWidth(700, 2)).toBe(700);
  });
});
