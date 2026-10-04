import { useState } from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import SettingsIcon from "@mui/icons-material/SettingsRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";

import { SlideTransition } from "../controls/SlideTransition";
import {
  DICE_SCALE_STEP,
  MAX_DICE_SCALE,
  MAX_TRAY_HEIGHT,
  MIN_DICE_SCALE,
  MIN_TRAY_HEIGHT,
  PREVIEW_HEIGHTS,
  TRAY_HEIGHT_STEP,
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

function Setting({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography>{label}</Typography>
        <Typography color="text.secondary" noWrap>
          {value}
        </Typography>
      </Stack>
      {children}
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Stack>
  );
}

/** Slider that shows its value while dragged but only reports it when released */
function CommittedSlider({
  label,
  hint,
  value,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const shown = dragged === null ? value : dragged;

  return (
    <Setting label={label} value={`${shown} px`} hint={hint}>
      <Slider
        aria-label={label}
        value={shown}
        min={MIN_TRAY_HEIGHT}
        max={MAX_TRAY_HEIGHT}
        step={TRAY_HEIGHT_STEP}
        onChange={(_, value) => setDragged(value as number)}
        onChangeCommitted={(_, value) => {
          setDragged(null);
          onCommit(value as number);
        }}
      />
    </Setting>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore((state) => state.settings);
  const changeSettings = useSettingsStore((state) => state.changeSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const previewIndex = Math.max(
    0,
    PREVIEW_HEIGHTS.indexOf(settings.previewHeight)
  );

  return (
    <Stack p={2} gap={2.5} overflow="auto">
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Настройки</Typography>
        <IconButton aria-label="закрыть настройки" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <CommittedSlider
        label="Высота маленького лотка"
        hint="Между маленьким и большим лотком переключает кнопка со стрелками в боковой панели."
        value={settings.trayHeightSmall}
        onCommit={(value) => changeSettings({ trayHeightSmall: value })}
      />
      <CommittedSlider
        label="Высота большого лотка"
        value={settings.trayHeightLarge}
        onCommit={(value) => changeSettings({ trayHeightLarge: value })}
      />
      <Setting
        label="Броски других игроков"
        value={previewIndex === 0 ? "не показывать" : `размер ${previewIndex}`}
        hint="Маленькие лотки в правом нижнем углу экрана."
      >
        <Slider
          aria-label="размер предпросмотра бросков других игроков"
          value={previewIndex}
          min={0}
          max={PREVIEW_HEIGHTS.length - 1}
          step={1}
          marks
          onChange={(_, value) =>
            changeSettings({ previewHeight: PREVIEW_HEIGHTS[value as number] })
          }
        />
      </Setting>
      <Setting
        label="Размер кубов"
        value={`${Math.round(settings.diceScale * 100)}%`}
        hint="Действует со следующего броска. Остальные видят твои кубы того же размера."
      >
        <Slider
          aria-label="размер кубов"
          value={settings.diceScale}
          min={MIN_DICE_SCALE}
          max={MAX_DICE_SCALE}
          step={DICE_SCALE_STEP}
          marks
          onChange={(_, value) => changeSettings({ diceScale: value as number })}
        />
      </Setting>
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
