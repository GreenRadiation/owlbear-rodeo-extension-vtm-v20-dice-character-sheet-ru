import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import AddIcon from "@mui/icons-material/AddRounded";
import RemoveIcon from "@mui/icons-material/RemoveRounded";

import { DicePreview } from "../previews/DicePreview";

import { MAX_POOL, useDiceControlsStore } from "./store";
import { useDiceRollStore } from "../dice/store";

/** Buttons to add and remove dice from the pool */
export function PoolControls() {
  const pool = useDiceControlsStore((state) => state.pool);
  const die = useDiceControlsStore((state) => state.diceSet.dice[0]);
  const addToPool = useDiceControlsStore((state) => state.addToPool);

  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const roll = useDiceRollStore((state) => state.roll);

  function handleChange(count: number) {
    addToPool(count);
    if (roll) {
      clearRoll();
    }
  }

  return (
    <>
      <Tooltip title="Добавить куб" placement="right" disableInteractive>
        <span>
          <IconButton
            aria-label="добавить куб"
            onClick={() => handleChange(1)}
            disabled={pool >= MAX_POOL}
          >
            <AddIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Badge
        badgeContent={pool}
        sx={{
          ".MuiBadge-badge": {
            bgcolor: "background.default",
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.30), rgba(255, 255, 255, 0.30))",
            pointerEvents: "none",
          },
        }}
        overlap="circular"
      >
        <IconButton
          aria-label="добавить куб"
          onClick={() => handleChange(1)}
          disabled={pool >= MAX_POOL}
          sx={{ p: 0 }}
        >
          <DicePreview diceStyle={die.style} diceType={die.type} />
        </IconButton>
      </Badge>
      <Tooltip title="Убрать куб" placement="right" disableInteractive>
        <span>
          <IconButton
            aria-label="убрать куб"
            onClick={() => handleChange(-1)}
            disabled={pool <= 0}
          >
            <RemoveIcon />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}
