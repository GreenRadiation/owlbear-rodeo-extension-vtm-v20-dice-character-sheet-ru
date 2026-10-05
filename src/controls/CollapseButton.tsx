import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import CollapseIcon from "@mui/icons-material/UnfoldLessRounded";
import ExpandIcon from "@mui/icons-material/UnfoldMoreRounded";

import { useSettingsStore } from "../settings/store";

/**
 * Button that gets everything of the extension out of the way of the map
 * and brings it back: the tray, the character sheet and the previews of
 * the rolls of other players.
 */
export function CollapseButton() {
  const collapsed = useSettingsStore((state) => state.settings.collapsed);
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  if (collapsed) {
    // The collapsed window has no room for a tooltip of its own
    return (
      <IconButton
        aria-label="Развернуть всё"
        title="Развернуть всё"
        onClick={() => changeSettings({ collapsed: false })}
      >
        <ExpandIcon />
      </IconButton>
    );
  }

  return (
    <Tooltip title="Свернуть всё" placement="right" disableInteractive>
      <IconButton
        aria-label="Свернуть всё"
        onClick={() => changeSettings({ collapsed: true })}
      >
        <CollapseIcon />
      </IconButton>
    </Tooltip>
  );
}
