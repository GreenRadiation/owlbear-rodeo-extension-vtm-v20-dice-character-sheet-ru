import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Theme } from "@mui/material/styles";

import environment from "../environment.hdr";
import { useDiceControlsStore } from "../controls/store";
import { Dice } from "../dice/Dice";
import {
  DEFAULT_LOOK,
  DiceLook,
  FINISHES,
  FINISH_DEFAULTS,
  Finish,
  PATTERNS,
  Pattern,
  randomLook,
} from "../dice/look";
import { DiceLookContext } from "../dice/lookContext";
import { ICONS, ICON_IDS } from "../materials/custom/icons";
import { Die } from "../types/Die";

const PATTERN_NAMES: Record<Pattern, string> = {
  solid: "Ровный",
  gradient: "Градиент",
  halves: "Половины",
  rings: "Кольца",
  marble: "Мрамор",
  speckles: "Крапинки",
};

const FINISH_NAMES: Record<Finish, string> = {
  plastic: "Пластик",
  gloss: "Лак",
  metal: "Металл",
  pearl: "Перламутр",
  glass: "Стекло",
};

const PREVIEW_DIE: Die = { id: "preview", style: "CUSTOM", type: "D10" };
/** Where the "0" and the "1" are on the mesh of a D10, see meshes/rounded/D10.tsx */
const TEN_FACE: [number, number, number] = [0.4, 0.42, -0.56];
const ONE_FACE: [number, number, number] = [-0.7, -0.37, -0.22];
const TOWARDS_CAMERA = new THREE.Vector3(0, 0.45, 1).normalize();

/** A die that shows one of its faces to the camera and sways a little to catch the light */
function ShownDie({
  face,
  twist,
  x,
}: {
  face: [number, number, number];
  /** Turn around the face that puts its digit upright, in radians */
  twist: number;
  x: number;
}) {
  const ref = useRef<THREE.Group>(null);

  const rest = useMemo(() => {
    const toCamera = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(...face).normalize(),
      TOWARDS_CAMERA
    );
    const upright = new THREE.Quaternion().setFromAxisAngle(
      TOWARDS_CAMERA,
      twist
    );
    return upright.multiply(toCamera);
  }, [face, twist]);

  const sway = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  useFrame(({ clock }) => {
    const group = ref.current;
    if (group) {
      const time = clock.elapsedTime;
      euler.set(Math.sin(time * 0.9) * 0.3, Math.sin(time * 0.6 + x) * 0.5, 0);
      group.quaternion.copy(sway.setFromEuler(euler)).multiply(rest);
    }
  });

  return (
    <group ref={ref} position={[x, 0, 0]}>
      <Dice die={PREVIEW_DIE} />
    </group>
  );
}

/** Two dice with the look: one shows its ten, the other its one */
function LookPreview({ look }: { look: DiceLook }) {
  return (
    <Box
      component="div"
      height={170}
      borderRadius={1}
      overflow="hidden"
      bgcolor="rgba(0, 0, 0, 0.3)"
    >
      <Canvas camera={{ position: [0, 0.27, 0.6], fov: 28 }}>
        <Suspense fallback={null}>
          <Environment files={environment} />
          {/* Contexts don't reach into a canvas from the outside */}
          <DiceLookContext.Provider value={look}>
            <ShownDie face={TEN_FACE} twist={TEN_TWIST} x={-0.13} />
            <ShownDie face={ONE_FACE} twist={ONE_TWIST} x={0.13} />
          </DiceLookContext.Provider>
        </Suspense>
      </Canvas>
    </Box>
  );
}

/** Found by looking: with these the digits of the two dice of the preview stand upright */
const TEN_TWIST = -Math.PI / 2;
const ONE_TWIST = Math.PI;

function Choices<T extends string>({
  label,
  value,
  choices,
  names,
  onChange,
}: {
  label: string;
  value: T;
  choices: readonly T[];
  names: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      gap={0.5}
      role="group"
      aria-label={label}
    >
      {choices.map((choice) => (
        <Button
          key={choice}
          size="small"
          sx={{ minWidth: 0, px: 1, py: 0.25, textTransform: "none" }}
          variant={choice === value ? "contained" : "outlined"}
          aria-pressed={choice === value}
          onClick={() => onChange(choice)}
        >
          {names[choice]}
        </Button>
      ))}
    </Stack>
  );
}

function ColorSetting({
  label,
  value,
  inherited,
  onChange,
  onClear,
}: {
  label: string;
  /** An empty string when the color of the digits is used */
  value: string;
  /** The color that is used when there is no value */
  inherited?: string;
  onChange: (value: string) => void;
  /** Go back to the color of the digits */
  onClear?: () => void;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1} minHeight={30}>
      <Typography flex={1} noWrap>
        {label}
      </Typography>
      {onClear && value && (
        <Button
          size="small"
          color="inherit"
          sx={{ minWidth: 0, py: 0, textTransform: "none" }}
          onClick={onClear}
        >
          как цифры
        </Button>
      )}
      <input
        type="color"
        aria-label={label}
        value={value || inherited || "#000000"}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: 44,
          height: 28,
          padding: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
        }}
      />
    </Stack>
  );
}

function LookSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  // Shows the value while dragged, the die is only painted again on release
  const [dragged, setDragged] = useState<number | null>(null);
  const shown = dragged === null ? value : dragged;

  return (
    <Stack direction="row" alignItems="center" gap={2}>
      <Typography width={130} flexShrink={0} noWrap>
        {label}
      </Typography>
      <Slider
        size="small"
        aria-label={label}
        value={shown}
        min={0}
        max={1}
        step={0.05}
        onChange={(_, value) => setDragged(value as number)}
        onChangeCommitted={(_, value) => {
          setDragged(null);
          onChange(value as number);
        }}
      />
      <Typography width={40} textAlign="right" color="text.secondary">
        {Math.round(shown * 100)}%
      </Typography>
    </Stack>
  );
}

/** Pick the digit itself or an icon that replaces it */
function IconSetting({
  label,
  digit,
  value,
  onChange,
}: {
  label: string;
  digit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const choice = (selected: boolean) => ({
    width: 30,
    height: 30,
    borderRadius: 1,
    // Icons are black shapes: keep them on something light in every theme
    bgcolor: "#e4e4e4",
    color: "#000",
    fontWeight: 700,
    outline: selected ? "3px solid" : "none",
    outlineColor: (theme: Theme) => theme.palette.primary.main,
  });

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      gap={0.75}
      role="group"
      aria-label={label}
    >
      <ButtonBase
        aria-label={`${label}: цифра`}
        aria-pressed={value === ""}
        onClick={() => onChange("")}
        sx={choice(value === "")}
      >
        {digit}
      </ButtonBase>
      {ICONS.map((icon) => (
        <ButtonBase
          key={icon.id}
          aria-label={`${label}: ${icon.id}`}
          aria-pressed={value === icon.id}
          title={icon.id}
          onClick={() => onChange(icon.id)}
          sx={choice(value === icon.id)}
        >
          <img src={icon.url} width={22} height={22} alt="" />
        </ButtonBase>
      ))}
    </Stack>
  );
}

/** The editor of the custom dice of the player */
export function DiceLookSettings() {
  const look = useDiceControlsStore((state) => state.look);
  const changeLook = useDiceControlsStore((state) => state.changeLook);

  return (
    <Stack gap={1}>
      <LookPreview look={look} />
      <Stack direction="row" gap={1}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => changeLook(randomLook(ICON_IDS))}
        >
          Случайный
        </Button>
        <Button
          size="small"
          color="inherit"
          onClick={() => changeLook(DEFAULT_LOOK)}
        >
          Как в начале
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" mt={0.5}>
        Корпус
      </Typography>
      <ColorSetting
        label="Цвет"
        value={look.body}
        onChange={(body) => changeLook({ body })}
      />
      <ColorSetting
        label="Второй цвет"
        value={look.body2}
        onChange={(body2) => changeLook({ body2 })}
      />
      <Choices
        label="Узор"
        value={look.pattern}
        choices={PATTERNS}
        names={PATTERN_NAMES}
        onChange={(pattern) => changeLook({ pattern })}
      />
      <LookSlider
        label="Сила узора"
        value={look.patternStrength}
        onChange={(patternStrength) => changeLook({ patternStrength })}
      />

      <Typography variant="body2" color="text.secondary" mt={0.5}>
        Цифры
      </Typography>
      <ColorSetting
        label="Цвет"
        value={look.digits}
        onChange={(digits) => changeLook({ digits })}
      />
      <LookSlider
        label="Свечение"
        value={look.glow}
        onChange={(glow) => changeLook({ glow })}
      />
      <ColorSetting
        label="Десятка"
        value={look.tenColor}
        inherited={look.digits}
        onChange={(tenColor) => changeLook({ tenColor })}
        onClear={() => changeLook({ tenColor: "" })}
      />
      <IconSetting
        label="Значок десятки"
        digit="0"
        value={look.tenIcon}
        onChange={(tenIcon) => changeLook({ tenIcon })}
      />
      <ColorSetting
        label="Единица"
        value={look.oneColor}
        inherited={look.digits}
        onChange={(oneColor) => changeLook({ oneColor })}
        onClear={() => changeLook({ oneColor: "" })}
      />
      <IconSetting
        label="Значок единицы"
        digit="1"
        value={look.oneIcon}
        onChange={(oneIcon) => changeLook({ oneIcon })}
      />

      <Typography variant="body2" color="text.secondary" mt={0.5}>
        Поверхность
      </Typography>
      <Choices
        label="Поверхность"
        value={look.finish}
        choices={FINISHES}
        names={FINISH_NAMES}
        // A finish comes with its own roughness and metalness, they can be changed after
        onChange={(finish) =>
          changeLook({ finish, ...FINISH_DEFAULTS[finish] })
        }
      />
      <LookSlider
        label="Шероховатость"
        value={look.roughness}
        onChange={(roughness) => changeLook({ roughness })}
      />
      <LookSlider
        label="Металличность"
        value={look.metalness}
        onChange={(metalness) => changeLook({ metalness })}
      />
    </Stack>
  );
}
