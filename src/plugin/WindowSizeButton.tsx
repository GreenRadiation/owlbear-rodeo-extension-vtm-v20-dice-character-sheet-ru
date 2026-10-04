import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import LargerIcon from "@mui/icons-material/OpenInFullRounded";
import SmallerIcon from "@mui/icons-material/CloseFullscreenRounded";

import { getTrayHeight, useSettingsStore } from "../settings/store";

/**
 * Button that switches the window of the tray between its small and large sizes.
 * Also keeps the window at the height picked in the settings,
 * the width follows the height (see ResizeObserver).
 */
export function WindowSizeButton() {
  const settings = useSettingsStore((state) => state.settings);
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  const height = getTrayHeight(settings);
  useEffect(() => {
    OBR.action.setHeight(height);
  }, [height]);

  const title = settings.trayLarge ? "Маленький лоток" : "Большой лоток";

  return (
    <Tooltip title={title} placement="top" disableInteractive>
      <IconButton
        aria-label={title}
        onClick={() => changeSettings({ trayLarge: !settings.trayLarge })}
      >
        {settings.trayLarge ? <SmallerIcon /> : <LargerIcon />}
      </IconButton>
    </Tooltip>
  );
}
