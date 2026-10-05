import { useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Grow from "@mui/material/Grow";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import AddIcon from "@mui/icons-material/AddRounded";
import RemoveIcon from "@mui/icons-material/RemoveRounded";
import DifficultyIcon from "@mui/icons-material/TerrainRounded";
import CheckedIcon from "@mui/icons-material/CheckBoxRounded";
import UncheckedIcon from "@mui/icons-material/CheckBoxOutlineBlankRounded";

import {
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  formatOutcome,
  formatValue,
  getRollOutcome,
  sortValues,
} from "../v20/roll";
import { useSymbols } from "../settings/store";

/**
 * The result of a finished roll: successes against a difficulty.
 * The difficulty and the speciality can be changed when their
 * change handlers are provided.
 */
export function RollResult({
  values,
  difficulty,
  onDifficultyChange,
  specialty,
  onSpecialtyChange,
  expanded,
  onExpand,
  wide,
}: {
  /** Values of the dice in the 1-10 range */
  values: number[];
  difficulty: number;
  onDifficultyChange?: (difficulty: number) => void;
  /** Count every ten as two successes */
  specialty: boolean;
  onSpecialtyChange?: (specialty: boolean) => void;
  expanded: boolean;
  onExpand: (expand: boolean) => void;
  /**
   * There is room for the difficulty and the speciality at the sides of the result.
   * The result then takes the whole width it is given and puts them
   * halfway between its middle and its edges.
   */
  wide?: boolean;
}) {
  const symbols = useSymbols();
  const outcome = useMemo(
    () => getRollOutcome(values, difficulty, specialty),
    [values, difficulty, specialty]
  );
  const sorted = useMemo(() => sortValues(values), [values]);

  // The tooltip of the result hangs below everything here, right under the
  // result it would cover the values it is about
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  const result = (
    <Tooltip
      title={expanded ? "Скрыть значения" : "Показать значения"}
      disableInteractive
      PopperProps={root ? { anchorEl: root } : undefined}
    >
      <Button
        sx={{ pointerEvents: "all", padding: 0.5, minWidth: "40px" }}
        onClick={() => onExpand(!expanded)}
        color="inherit"
      >
        <Typography variant="h4" color="white">
          {formatOutcome(outcome, symbols)}
        </Typography>
      </Button>
    </Tooltip>
  );

  const difficultyControl = (
    <Stack direction="row" alignItems="center" sx={{ pointerEvents: "all" }}>
      {onDifficultyChange && (
        <IconButton
          size="small"
          aria-label="понизить сложность"
          onClick={() => onDifficultyChange(difficulty - 1)}
          disabled={difficulty <= MIN_DIFFICULTY}
          sx={{ color: "white" }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
      )}
      <Tooltip title="Сложность" disableInteractive>
        <Stack alignItems="center" width="32px">
          <DifficultyIcon
            sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 16 }}
          />
          <Typography color="white" lineHeight="18px">
            {difficulty}
          </Typography>
        </Stack>
      </Tooltip>
      {onDifficultyChange && (
        <IconButton
          size="small"
          aria-label="повысить сложность"
          onClick={() => onDifficultyChange(difficulty + 1)}
          disabled={difficulty >= MAX_DIFFICULTY}
          sx={{ color: "white" }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );

  // The speciality is a checkbox over two tens: a ten counts twice
  const SpecialtyIcon = specialty ? CheckedIcon : UncheckedIcon;
  const specialtyLabel = (
    <Stack alignItems="center" px={0.75}>
      <SpecialtyIcon sx={{ color: "white", fontSize: 18 }} />
      <Typography color="white" variant="body2" lineHeight="16px" noWrap>
        {symbols.ten.length > 1
          ? `${symbols.ten} ${symbols.ten}`
          : `${symbols.ten}${symbols.ten}`}
      </Typography>
    </Stack>
  );
  const specialtyTitle = "Специализация: десятка считается за два успеха";
  const specialtyControl = onSpecialtyChange ? (
    <Tooltip title={specialtyTitle} disableInteractive>
      <ButtonBase
        role="checkbox"
        aria-checked={specialty}
        aria-label="Специализация"
        onClick={() => onSpecialtyChange(!specialty)}
        sx={{ pointerEvents: "all", borderRadius: 1, py: 0.25 }}
      >
        {specialtyLabel}
      </ButtonBase>
    </Tooltip>
  ) : (
    // Someone else's roll: only mention the speciality when it is on
    specialty && (
      <Tooltip title={specialtyTitle} disableInteractive>
        <span style={{ pointerEvents: "all" }}>{specialtyLabel}</span>
      </Tooltip>
    )
  );

  return (
    <Stack alignItems="center" width={wide ? "100%" : undefined} ref={setRoot}>
      {wide ? (
        // The sides are as wide as each other to keep the result in the middle
        <Box
          component="div"
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            justifyItems: "center",
            width: "100%",
          }}
        >
          {difficultyControl}
          {result}
          <div>{specialtyControl}</div>
        </Box>
      ) : (
        <>
          {result}
          {difficultyControl}
          {specialtyControl}
        </>
      )}
      <Grow
        in={expanded}
        mountOnEnter
        unmountOnExit
        style={{ transformOrigin: "50% 0 0" }}
      >
        <Typography color="white" textAlign="center" mt={1} px={1}>
          {sorted.map((value) => formatValue(value, symbols)).join("  ")}
        </Typography>
      </Grow>
    </Stack>
  );
}

/** Narrowest a tray can be to have the difficulty and the speciality at the sides of the result */
export const WIDE_RESULT_WIDTH = 420;
