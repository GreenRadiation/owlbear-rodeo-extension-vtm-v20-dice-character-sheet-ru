import { describe, expect, it, vi } from "vitest";

// The store reads the browser storage when it is created
vi.stubGlobal("localStorage", {
  getItem: () => null,
  setItem: () => {},
});
vi.stubGlobal("window", { addEventListener: () => {} });

const { defaultSettings, getTrayHeight, sanitizeSettings } = await import(
  "./store"
);

describe("settings", () => {
  it("falls back to the defaults", () => {
    expect(sanitizeSettings(undefined)).toEqual(defaultSettings);
    expect(sanitizeSettings("nonsense")).toEqual(defaultSettings);
    expect(sanitizeSettings({ diceScale: "big" })).toEqual(defaultSettings);
  });

  it("keeps valid values and clamps the rest", () => {
    const settings = sanitizeSettings({
      trayHeightSmall: 400,
      trayHeightLarge: 5000,
      trayLarge: false,
      previewHeight: 240,
      diceScale: 0.1,
    });
    expect(settings).toEqual({
      trayHeightSmall: 400,
      trayHeightLarge: 1200,
      trayLarge: false,
      previewHeight: 240,
      diceScale: 0.7,
    });
  });

  it("only accepts the listed preview heights", () => {
    expect(sanitizeSettings({ previewHeight: 0 }).previewHeight).toBe(0);
    expect(sanitizeSettings({ previewHeight: 123 }).previewHeight).toBe(
      defaultSettings.previewHeight
    );
  });

  it("picks the height of the tray for its current size", () => {
    expect(getTrayHeight({ ...defaultSettings, trayLarge: true })).toBe(
      defaultSettings.trayHeightLarge
    );
    expect(getTrayHeight({ ...defaultSettings, trayLarge: false })).toBe(
      defaultSettings.trayHeightSmall
    );
  });
});
