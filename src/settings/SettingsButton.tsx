import { useState } from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import SettingsIcon from "@mui/icons-material/SettingsRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";

import { SlideTransition } from "../controls/SlideTransition";
import { PluginGate } from "../plugin/PluginGate";
import { RoomDataSettings } from "../plugin/RoomDataSettings";
import {
  DICE_SCALE_STEP,
  MAX_DICE_SCALE,
  MAX_SHEET_COLUMNS,
  MAX_SHEET_SIZE,
  MAX_TRAY_HEIGHT,
  MAX_TRAY_WIDTH,
  MIN_DICE_SCALE,
  MIN_SHEET_COLUMNS,
  MIN_SHEET_SIZE,
  MIN_TRAY_HEIGHT,
  MIN_TRAY_WIDTH,
  PREVIEW_HEIGHTS,
  SHEET_SIZE_STEP,
  TRAY_HEIGHT_STEP,
  TRAY_WIDTH_STEP,
  useSettingsStore,
} from "./store";

/** Button that opens the personal settings of the player over the tray */
export function SettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Настройки" placement="top" disableInteractive>
        <IconButton aria-label="настройки" onClick={() => setOpen(true)}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen
        TransitionComponent={SlideTransition}
      >
        <Settings onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

/**
 * A slider with its name and value.
 * Shows the value while dragged but only reports it when released:
 * some settings resize the window and a slider that changes its width
 * while it is dragged jumps around.
 */
function Setting({
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

const percent = (value: number) => `${Math.round(value * 100)}%`;
const pixels = (value: number) => `${value} px`;

/** The settings of one of the two modes of the tray */
function ModeSettings({ large }: { large: boolean }) {
  const mode = useSettingsStore((state) =>
    large ? state.settings.large : state.settings.small
  );
  const active = useSettingsStore(
    (state) => state.settings.trayLarge === large
  );
  const changeMode = useSettingsStore((state) => state.changeMode);
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  return (
    <Stack flex={1} minWidth={0} gap={1}>
      <Button
        size="small"
        variant={active ? "contained" : "outlined"}
        onClick={() => changeSettings({ trayLarge: large })}
      >
        {large ? "Большой" : "Маленький"}
      </Button>
      <Setting
        label="Высота"
        value={mode.height}
        format={pixels}
        min={MIN_TRAY_HEIGHT}
        max={MAX_TRAY_HEIGHT}
        step={TRAY_HEIGHT_STEP}
        onChange={(height) => changeMode(large, { height })}
      />
      <Setting
        label="Ширина"
        value={mode.width}
        format={percent}
        min={MIN_TRAY_WIDTH}
        max={MAX_TRAY_WIDTH}
        step={TRAY_WIDTH_STEP}
        marks
        onChange={(width) => changeMode(large, { width })}
      />
      <Setting
        label="Кубы"
        value={mode.diceScale}
        format={percent}
        min={MIN_DICE_SCALE}
        max={MAX_DICE_SCALE}
        step={DICE_SCALE_STEP}
        marks
        onChange={(diceScale) => changeMode(large, { diceScale })}
      />
      <Typography variant="body2" color="text.secondary" mt={0.5}>
        Лист персонажа
      </Typography>
      <Stack direction="row" gap={0.5}>
        <Button
          size="small"
          sx={{ flex: 1, minWidth: 0, px: 0.5 }}
          variant={mode.sheetPlacement === "below" ? "contained" : "outlined"}
          onClick={() => changeMode(large, { sheetPlacement: "below" })}
        >
          Снизу
        </Button>
        <Button
          size="small"
          sx={{ flex: 1, minWidth: 0, px: 0.5 }}
          variant={mode.sheetPlacement === "right" ? "contained" : "outlined"}
          onClick={() => changeMode(large, { sheetPlacement: "right" })}
        >
          Справа
        </Button>
      </Stack>
      {mode.sheetPlacement === "below" ? (
        <Setting
          label="Высота"
          value={mode.sheetHeight}
          format={pixels}
          min={MIN_SHEET_SIZE}
          max={MAX_SHEET_SIZE}
          step={SHEET_SIZE_STEP}
          onChange={(sheetHeight) => changeMode(large, { sheetHeight })}
        />
      ) : (
        <Setting
          label="Ширина"
          value={mode.sheetWidth}
          format={pixels}
          min={MIN_SHEET_SIZE}
          max={MAX_SHEET_SIZE}
          step={SHEET_SIZE_STEP}
          onChange={(sheetWidth) => changeMode(large, { sheetWidth })}
        />
      )}
      <Setting
        label="Колонки"
        value={mode.sheetColumns}
        format={(value) => `${value}`}
        min={MIN_SHEET_COLUMNS}
        max={MAX_SHEET_COLUMNS}
        step={1}
        marks
        onChange={(sheetColumns) => changeMode(large, { sheetColumns })}
      />
    </Stack>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const previewHeight = useSettingsStore(
    (state) => state.settings.previewHeight
  );
  const changeSettings = useSettingsStore((state) => state.changeSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  return (
    <Stack p={2} gap={2} sx={{ overflowX: "hidden", overflowY: "auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Настройки</Typography>
        <IconButton aria-label="закрыть настройки" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Stack gap={0.5}>
        <Typography>Лоток</Typography>
        <Typography variant="caption" color="text.secondary">
          У лотка два режима со своими настройками. Переключает их кнопка со
          стрелками в боковой панели или кнопки ниже. Ширина и размер кубов
          действуют со следующего броска, остальные игроки видят твой лоток и
          кубы такими же. Лист персонажа снизу занимает ширину лотка, справа
          высоту лотка; его текст подстраивается под ширину колонок.
        </Typography>
      </Stack>
      <Stack direction="row" gap={2}>
        <ModeSettings large={false} />
        <Divider orientation="vertical" flexItem />
        <ModeSettings large={true} />
      </Stack>
      <Divider />
      <Stack gap={0.5}>
        <Setting
          label="Броски других игроков"
          value={Math.max(0, PREVIEW_HEIGHTS.indexOf(previewHeight))}
          format={(index) => (index === 0 ? "не показывать" : `размер ${index}`)}
          min={0}
          max={PREVIEW_HEIGHTS.length - 1}
          step={1}
          marks
          onChange={(index) =>
            changeSettings({ previewHeight: PREVIEW_HEIGHTS[index] })
          }
        />
        <Typography variant="caption" color="text.secondary">
          Маленькие лотки в правом нижнем углу экрана.
        </Typography>
      </Stack>
      <PluginGate>
        <Divider />
        <RoomDataSettings />
      </PluginGate>
      <Stack direction="row" justifyContent="space-between">
        <Button color="inherit" onClick={resetSettings}>
          Сбросить
        </Button>
        <Button variant="contained" onClick={onClose}>
          Готово
        </Button>
      </Stack>
    </Stack>
  );
}
