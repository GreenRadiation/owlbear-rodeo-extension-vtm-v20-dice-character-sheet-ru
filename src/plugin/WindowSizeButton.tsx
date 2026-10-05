import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import LargerIcon from "@mui/icons-material/OpenInFullRounded";
import SmallerIcon from "@mui/icons-material/CloseFullscreenRounded";

import { useSettingsStore } from "../settings/store";

/** Button that switches the tray between its small and large modes */
export function WindowSizeButton() {
  const trayLarge = useSettingsStore((state) => state.settings.trayLarge);
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  const title = trayLarge ? "Маленький лоток" : "Большой лоток";

  return (
    <Tooltip title={title} placement="top" disableInteractive>
      <IconButton
        aria-label={title}
        onClick={() => changeSettings({ trayLarge: !trayLarge })}
      >
        {trayLarge ? <SmallerIcon /> : <LargerIcon />}
      </IconButton>
    </Tooltip>
  );
}
