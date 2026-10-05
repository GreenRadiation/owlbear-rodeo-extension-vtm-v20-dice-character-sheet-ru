import { useState } from "react";

import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import SettingsIcon from "@mui/icons-material/SettingsRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import CollapseIcon from "@mui/icons-material/ExpandLessRounded";

import { SlideTransition } from "../controls/SlideTransition";
import { isCustomDiceSet, useDiceControlsStore } from "../controls/store";
import { CustomDicePreview } from "../previews/CustomDicePreview";
import { DiceLookSettings } from "./DiceLookSettings";
import { diceSets } from "../sets/diceSets";
import { PluginGate } from "../plugin/PluginGate";
import { RoomDataSettings } from "../plugin/RoomDataSettings";
import { ONE_SYMBOLS, TEN_SYMBOLS } from "../v20/roll";
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
  MAX_HISTORY_LENGTH,
  MAX_PREVIEW_HEIGHT,
  MIN_HISTORY_LENGTH,
  MIN_PREVIEW_HEIGHT,
  PREVIEW_HEIGHT_STEP,
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

/** A choice between a few symbols */
function SymbolSetting({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Typography flex={1} noWrap>
        {label}
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        aria-label={label}
        value={value}
        onChange={(_, value) => value && onChange(value)}
      >
        {choices.map((choice) => (
          <ToggleButton
            key={choice}
            value={choice}
            sx={{ minWidth: 34, py: 0.25, fontSize: "1.1rem", lineHeight: 1.4 }}
          >
            {choice}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

/** The look of the dice of the player, everyone sees the rolls in it */
function DiceStyleSetting() {
  const diceSet = useDiceControlsStore((state) => state.diceSet);
  const changeDiceSet = useDiceControlsStore((state) => state.changeDiceSet);
  const look = useDiceControlsStore((state) => state.look);

  return (
    <Stack gap={0.5}>
      <Typography>Стиль кубов</Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {diceSets.map((set) => (
          <IconButton
            key={set.id}
            aria-label={set.name}
            aria-pressed={diceSet.id === set.id}
            onClick={() => changeDiceSet(set)}
            sx={{
              padding: "4px",
              backgroundColor:
                diceSet.id === set.id
                  ? "rgba(255, 255, 255, 0.16) !important"
                  : undefined,
            }}
          >
            {isCustomDiceSet(set) ? (
              <CustomDicePreview look={look} size={36} />
            ) : (
              <img src={set.previewImage} width={36} height={36} alt="" />
            )}
          </IconButton>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Последний куб в ряду — свой: цвета, узор, значки и поверхность
        настраиваются ниже. Другие игроки видят твои кубы такими же.
      </Typography>
      {isCustomDiceSet(diceSet) && <DiceLookSettings />}
    </Stack>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore((state) => state.settings);
  const changeSettings = useSettingsStore((state) => state.changeSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const changeDiceSet = useDiceControlsStore((state) => state.changeDiceSet);

  const [specialOpen, setSpecialOpen] = useState(false);

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
          стрелками в боковой панели или кнопки ниже. Ширина считается от
          высоты: 100% это квадрат, больше 100% это лоток, лежащий на боку.
          Ширина и размер кубов действуют со следующего броска. Лист персонажа
          снизу занимает ширину лотка, справа высоту лотка; его текст
          подстраивается под ширину колонок.
        </Typography>
      </Stack>
      <Stack direction="row" gap={2}>
        <ModeSettings large={false} />
        <Divider orientation="vertical" flexItem />
        <ModeSettings large={true} />
      </Stack>
      <Divider />
      <Stack gap={0.5}>
        <FormControlLabel
          label="Показывать броски других игроков"
          control={
            <Checkbox
              size="small"
              checked={settings.previewEnabled}
              onChange={(event) =>
                changeSettings({ previewEnabled: event.target.checked })
              }
            />
          }
        />
        <Typography variant="caption" color="text.secondary">
          Маленькие лотки в правом нижнем углу экрана. Отдельного игрока можно
          убрать оттуда кнопкой в его лотке, который открывается по его иконке.
        </Typography>
        {settings.previewEnabled && (
          <Setting
            label="Высота маленьких лотков"
            value={settings.previewHeight}
            format={pixels}
            min={MIN_PREVIEW_HEIGHT}
            max={MAX_PREVIEW_HEIGHT}
            step={PREVIEW_HEIGHT_STEP}
            onChange={(previewHeight) => changeSettings({ previewHeight })}
          />
        )}
        <FormControlLabel
          label="Только бросок последнего игрока"
          control={
            <Checkbox
              size="small"
              checked={settings.previewLastOnly}
              onChange={(event) =>
                changeSettings({ previewLastOnly: event.target.checked })
              }
            />
          }
        />
        {settings.hiddenPreviews.length > 0 && (
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary" flex={1}>
              Скрыто игроков: {settings.hiddenPreviews.length}
            </Typography>
            <Button
              size="small"
              color="inherit"
              onClick={() => changeSettings({ hiddenPreviews: [] })}
            >
              Показывать всех
            </Button>
          </Stack>
        )}
      </Stack>
      <Divider />
      <Stack gap={0.5}>
        <Setting
          label="Бросков в истории"
          value={settings.historyLength}
          format={(value) => `${value}`}
          min={MIN_HISTORY_LENGTH}
          max={MAX_HISTORY_LENGTH}
          step={1}
          marks
          onChange={(historyLength) => changeSettings({ historyLength })}
        />
        <Typography variant="caption" color="text.secondary">
          Сколько последних бросков показывает кнопка истории, у тебя и у других
          игроков. Комната хранит по {MAX_HISTORY_LENGTH} бросков на игрока
          независимо от этой настройки.
        </Typography>
      </Stack>
      <Divider />
      <DiceStyleSetting />
      <Stack gap={1}>
        <SymbolSetting
          label="Десятка"
          value={settings.tenSymbol}
          choices={TEN_SYMBOLS}
          onChange={(tenSymbol) => changeSettings({ tenSymbol })}
        />
        <SymbolSetting
          label="Единица и ботч"
          value={settings.oneSymbol}
          choices={ONE_SYMBOLS}
          onChange={(oneSymbol) => changeSettings({ oneSymbol })}
        />
      </Stack>
      <PluginGate>
        <Divider />
        <Stack>
          <Button
            color="inherit"
            sx={{ justifyContent: "space-between", textTransform: "none" }}
            endIcon={specialOpen ? <CollapseIcon /> : <ExpandIcon />}
            aria-expanded={specialOpen}
            onClick={() => setSpecialOpen(!specialOpen)}
          >
            Специальные возможности
          </Button>
          <Collapse in={specialOpen} unmountOnExit>
            <Stack pt={1}>
              <RoomDataSettings />
            </Stack>
          </Collapse>
        </Stack>
      </PluginGate>
      <Stack direction="row" justifyContent="space-between">
        <Button
          color="inherit"
          onClick={() => {
            resetSettings();
            changeDiceSet(diceSets[0]);
          }}
        >
          Сбросить
        </Button>
        <Button variant="contained" onClick={onClose}>
          Готово
        </Button>
      </Stack>
    </Stack>
  );
}
