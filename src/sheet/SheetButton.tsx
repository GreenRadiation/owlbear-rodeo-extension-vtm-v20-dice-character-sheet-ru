import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import SheetIcon from "@mui/icons-material/AssignmentIndRounded";

import { useSettingsStore } from "../settings/store";

/** Button that shows and hides the character sheet */
export function SheetButton() {
  const sheetOpen = useSettingsStore((state) => state.settings.sheetOpen);
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  const title = sheetOpen ? "Скрыть лист персонажа" : "Лист персонажа";

  return (
    <Tooltip title={title} placement="top" disableInteractive>
      <IconButton
        aria-label={title}
        aria-pressed={sheetOpen}
        onClick={() => changeSettings({ sheetOpen: !sheetOpen })}
        sx={{
          backgroundColor: sheetOpen
            ? "rgba(255, 255, 255, 0.16) !important"
            : undefined,
        }}
      >
        <SheetIcon />
      </IconButton>
    </Tooltip>
  );
}
