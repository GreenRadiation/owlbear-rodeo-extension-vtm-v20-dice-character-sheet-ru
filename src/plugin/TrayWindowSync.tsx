import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";
import throttle from "lodash.throttle";

import {
  getTrayMode,
  getTrayPixelWidth,
  useSettingsStore,
} from "../settings/store";

const THROTTLE_TIME = 100;
export const SIDEBAR_WIDTH = 60;

/**
 * Keep the window of the extension at the size picked in the settings:
 * the tray with the sidebar, plus the character sheet below or to the right
 * of the tray when it is open.
 * The height is asked for directly. Owlbear Rodeo can give less than was
 * asked when the screen is small, so the width follows the height the
 * window actually has.
 */
export function TrayWindowSync() {
  const mode = useSettingsStore((state) => getTrayMode(state.settings));
  const sheetOpen = useSettingsStore((state) => state.settings.sheetOpen);

  const sheetBelow = sheetOpen && mode.sheetPlacement === "below";
  const sheetRight = sheetOpen && mode.sheetPlacement === "right";

  const height = mode.height + (sheetBelow ? mode.sheetHeight : 0);
  useEffect(() => {
    OBR.action.setHeight(height);
  }, [height]);

  const trayHeight = mode.height;
  const trayWidth = mode.width;
  const sheetWidth = sheetRight ? mode.sheetWidth : 0;
  useEffect(() => {
    const handleResize = throttle(() => {
      // The tray gets smaller when the window can't be as high as it wants to be
      const actualTrayHeight = Math.min(trayHeight, window.innerHeight);
      OBR.action.setWidth(
        SIDEBAR_WIDTH +
          getTrayPixelWidth(actualTrayHeight, trayWidth) +
          sheetWidth
      );
    }, THROTTLE_TIME);

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      handleResize.cancel();
    };
  }, [trayHeight, trayWidth, sheetWidth]);

  return null;
}
