import { useDiceControlsStore, getDiceToRoll } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { getD10Flatness } from "../helpers/d10Faces";
import { useSettingsStore } from "../settings/store";

/**
 * Give the browser console access to the stores in development.
 * Used to script rolls when tuning the physics, see CLAUDE.md.
 */
export function exposeDebug() {
  const debug = window as unknown as Record<string, unknown>;
  debug.v20 = {
    useDiceControlsStore,
    useDiceRollStore,
    useSettingsStore,
    getDiceToRoll,
    getD10Flatness,
  };
}
