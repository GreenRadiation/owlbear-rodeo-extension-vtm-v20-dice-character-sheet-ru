import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";
import throttle from "lodash.throttle";

import { getTrayMode, useSettingsStore } from "../settings/store";

const THROTTLE_TIME = 100;
export const SIDEBAR_WIDTH = 60;

/**
 * Keep the window of the extension at the size picked in the settings.
 * The height is asked for directly. Owlbear Rodeo can give less than was
 * asked when the screen is small, so the width follows the height the
 * window actually has.
 */
export function TrayWindowSync() {
  const { height, width } = useSettingsStore((state) =>
    getTrayMode(state.settings)
  );

  useEffect(() => {
    OBR.action.setHeight(height);
  }, [height]);

  useEffect(() => {
    const handleResize = throttle(() => {
      OBR.action.setWidth((window.innerHeight / 2) * width + SIDEBAR_WIDTH);
    }, THROTTLE_TIME);

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      handleResize.cancel();
    };
  }, [width]);

  return null;
}
