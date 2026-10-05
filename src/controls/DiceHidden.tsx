import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import AllIcon from "@mui/icons-material/VisibilityRounded";
import GmIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import NoneIcon from "@mui/icons-material/VisibilityOffRounded";

import { Visibility, useDiceControlsStore } from "./store";
import { useDiceRollStore } from "../dice/store";
import { useRole } from "../plugin/useRole";

const TITLES: Record<Visibility, string> = {
  ALL: "Бросок видят все",
  GM: "Бросок видит только мастер",
  NONE: "Бросок не видит никто",
};

/** Button that picks who sees the next roll: everyone, only the GM or no one */
export function DiceHidden() {
  const visibility = useDiceControlsStore((state) => state.visibility);
  const cycleVisibility = useDiceControlsStore(
    (state) => state.cycleVisibility
  );

  const gm = useRole() === "GM";

  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const roll = useDiceRollStore((state) => state.roll);
  function clearRollIfNeeded() {
    if (roll) {
      clearRoll();
    }
  }

  return (
    <Tooltip title={TITLES[visibility]} placement="right" disableInteractive>
      <IconButton
        aria-label={TITLES[visibility]}
        onClick={() => {
          cycleVisibility(gm);
          clearRollIfNeeded();
        }}
      >
        {visibility === "ALL" && <AllIcon />}
        {visibility === "GM" && <GmIcon />}
        {visibility === "NONE" && <NoneIcon />}
      </IconButton>
    </Tooltip>
  );
}
