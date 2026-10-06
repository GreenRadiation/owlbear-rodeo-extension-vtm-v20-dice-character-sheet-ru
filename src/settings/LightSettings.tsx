import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { Setting } from "./Setting";
import {
  LIGHT_TILT_STEP,
  LIGHT_TURN_STEP,
  MAX_LIGHT_TILT,
  useSettingsStore,
} from "./store";

/** Where on the screen of an upright tray the light comes from, by its turn in degrees clockwise from the top */
const SIDES = [
  "сверху",
  "справа сверху",
  "справа",
  "справа снизу",
  "снизу",
  "слева снизу",
  "слева",
  "слева сверху",
];

function describeTurn(turn: number) {
  const side = SIDES[Math.round(turn / 45) % SIDES.length];
  return `${turn}°, ${side}`;
}

/**
 * The angle the light falls on the tray from.
 * Personal for now so that the group can pick an angle, meant to become the same for everyone.
 */
export function LightSettings() {
  const tilt = useSettingsStore((state) => state.settings.lightTilt);
  const turn = useSettingsStore((state) => state.settings.lightTurn);
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  return (
    <Stack gap={0.5}>
      <Typography>Свет в лотке</Typography>
      <Typography variant="caption" color="text.secondary">
        В оригинале свет падает ровно сверху, и блик всегда ложится на середину
        верхней грани. «Наклон» сдвигает источник света от зенита: 0° — ровно
        сверху, 90° — у горизонта. «Сторона» говорит, в какую сторону экрана он
        сдвинут, для лотка, стоящего вертикально; у лотка на боку стороны
        повёрнуты на четверть. Пока это личная настройка для подбора угла, потом
        она станет общей для всех.
      </Typography>
      <Setting
        label="Наклон"
        value={tilt}
        format={(value) => (value === 0 ? "ровно сверху" : `${value}°`)}
        min={0}
        max={MAX_LIGHT_TILT}
        step={LIGHT_TILT_STEP}
        onChange={(lightTilt) => changeSettings({ lightTilt })}
      />
      <Setting
        label="Сторона"
        value={turn}
        format={describeTurn}
        min={0}
        max={360 - LIGHT_TURN_STEP}
        step={LIGHT_TURN_STEP}
        onChange={(lightTurn) => changeSettings({ lightTurn })}
      />
    </Stack>
  );
}
