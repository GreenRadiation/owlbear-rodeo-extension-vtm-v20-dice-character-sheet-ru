import { useState } from "react";

import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/**
 * A slider with its name and value.
 * Shows the value while dragged but only reports it when released:
 * some settings resize the window and a slider that changes its width
 * while it is dragged jumps around.
 */
export function Setting({
  label,
  value,
  format,
  min,
  max,
  step,
  marks,
  onChange,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  min: number;
  max: number;
  step: number;
  marks?: boolean;
  onChange: (value: number) => void;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const shown = dragged === null ? value : dragged;

  return (
    <Stack>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography noWrap>{label}</Typography>
        <Typography color="text.secondary" noWrap>
          {format(shown)}
        </Typography>
      </Stack>
      {/* The thumb of the slider sticks out at the ends, leave room for it */}
      <Stack px={1.25}>
        <Slider
          aria-label={label}
          value={shown}
          min={min}
          max={max}
          step={step}
          marks={marks}
          onChange={(_, value) => setDragged(value as number)}
          onChangeCommitted={(_, value) => {
            setDragged(null);
            onChange(value as number);
          }}
        />
      </Stack>
    </Stack>
  );
}
