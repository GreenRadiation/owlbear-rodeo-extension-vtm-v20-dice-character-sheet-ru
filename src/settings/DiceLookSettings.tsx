import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Theme } from "@mui/material/styles";

import environment from "../environment.hdr";
import { getDefaultLook, useDiceControlsStore } from "../controls/store";
import { Dice } from "../dice/Dice";
import {
  DRAWN_PATTERNS,
  DiceLook,
  FINISHES,
  FINISH_PRESETS,
  Finish,
  Pattern,
  TEXTURE_PATTERNS,
  isTexturePattern,
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
  galaxy: "Галактика",
  gemstone: "Самоцвет",
  nebula: "Туманность",
  sunrise: "Рассвет",
  sunset: "Закат",
  walnut: "Орех",
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
/** Found by looking: with these the digits of the two dice of the preview stand upright */
const TEN_TWIST = -Math.PI / 2;
const ONE_TWIST = Math.PI;

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
      // Stays in view while the settings below it are scrolled
      sx={{
        position: "sticky",
        top: -16,
        zIndex: 2,
        bgcolor: "#16171f",
        boxShadow: 4,
      }}
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

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" mt={1}>
      {children}
    </Typography>
  );
}

function Choices<T extends string>({
  label,
  value,
  choices,
  names,
  onChange,
}: {
  label: string;
  /** Nothing is marked as picked without a value */
  value?: T;
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
          aria-pressed={value === undefined ? undefined : choice === value}
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
  clearLabel,
  onChange,
}: {
  label: string;
  /** An empty string when the color is left out */
  value: string;
  /** What the picker shows while the color is left out */
  inherited?: string;
  /** The name of the button that leaves the color out, for colors that can be */
  clearLabel?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1} minHeight={30}>
      <Typography flex={1} noWrap>
        {label}
      </Typography>
      {clearLabel &&
        (value ? (
          <Button
            size="small"
            color="inherit"
            sx={{ minWidth: 0, py: 0, textTransform: "none" }}
            onClick={() => onChange("")}
          >
            {clearLabel}
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary" noWrap>
            {clearLabel}
          </Typography>
        ))}
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
          opacity: value ? 1 : 0.45,
        }}
      />
    </Stack>
  );
}

function LookSlider({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  // Shows the value while dragged, the die only changes on release
  const [dragged, setDragged] = useState<number | null>(null);
  const shown = dragged === null ? value : dragged;

  return (
    <Stack direction="row" alignItems="center" gap={2}>
      <Typography width={150} flexShrink={0} noWrap>
        {label}
      </Typography>
      <Slider
        size="small"
        aria-label={label}
        value={shown}
        min={min}
        max={1}
        step={0.05}
        track={min < 0 ? false : "normal"}
        onChange={(_, value) => setDragged(value as number)}
        onChangeCommitted={(_, value) => {
          setDragged(null);
          onChange(value as number);
        }}
      />
      <Typography width={44} textAlign="right" color="text.secondary">
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

/** The editor of the custom dice of one of the slots of the player */
export function DiceLookSettings({ slot }: { slot: number }) {
  const look = useDiceControlsStore((state) => state.looks[slot]);
  const changeLooks = useDiceControlsStore((state) => state.changeLook);
  const changeLook = (update: Partial<DiceLook>) => changeLooks(slot, update);

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
          onClick={() => changeLook(getDefaultLook(slot))}
        >
          Как в начале
        </Button>
      </Stack>

      <Heading>Корпус</Heading>
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
        choices={DRAWN_PATTERNS}
        names={PATTERN_NAMES}
        onChange={(pattern) => changeLook({ pattern })}
      />
      <Typography variant="caption" color="text.secondary">
        Узоры готовых кубов в твоих цветах: тёмное красится первым цветом,
        светлое вторым.
      </Typography>
      <Choices
        label="Узор готового куба"
        value={look.pattern}
        choices={TEXTURE_PATTERNS}
        names={PATTERN_NAMES}
        onChange={(pattern) => changeLook({ pattern })}
      />
      <LookSlider
        label="Сила узора"
        value={look.patternStrength}
        onChange={(patternStrength) => changeLook({ patternStrength })}
      />
      {!isTexturePattern(look.pattern) && (
        <LookSlider
          label="Размер узора"
          value={look.patternScale}
          onChange={(patternScale) => changeLook({ patternScale })}
        />
      )}

      <Heading>Цифры и значки</Heading>
      <ColorSetting
        label="Цвет"
        value={look.digits}
        onChange={(digits) => changeLook({ digits })}
      />
      <ColorSetting
        label="Второй цвет: узор корпуса на цифрах"
        value={look.digits2}
        inherited={look.digits}
        clearLabel="без узора"
        onChange={(digits2) => changeLook({ digits2 })}
      />
      <ColorSetting
        label="Контур"
        value={look.outline}
        inherited="#000000"
        clearLabel="без контура"
        onChange={(outline) => changeLook({ outline })}
      />
      <LookSlider
        label="Свечение"
        value={look.glow}
        onChange={(glow) => changeLook({ glow })}
      />
      <LookSlider
        label="Глубина"
        value={look.engraving}
        min={-1}
        onChange={(engraving) => changeLook({ engraving })}
      />
      <Typography variant="caption" color="text.secondary">
        Глубина больше нуля — цифры вдавлены в куб, меньше нуля — выступают.
      </Typography>
      <LookSlider
        label="Шероховатость"
        value={look.digitsRoughness}
        onChange={(digitsRoughness) => changeLook({ digitsRoughness })}
      />
      <LookSlider
        label="Металличность"
        value={look.digitsMetalness}
        onChange={(digitsMetalness) => changeLook({ digitsMetalness })}
      />
      <FormControlLabel
        label="Лак и перелив корпуса ложатся и на цифры"
        control={
          <Checkbox
            size="small"
            checked={look.digitsCoated}
            onChange={(event) =>
              changeLook({ digitsCoated: event.target.checked })
            }
          />
        }
      />

      <Heading>Десятка</Heading>
      <ColorSetting
        label="Цвет"
        value={look.tenColor}
        inherited={look.digits}
        clearLabel="как цифры"
        onChange={(tenColor) => changeLook({ tenColor })}
      />
      <IconSetting
        label="Значок десятки"
        digit="0"
        value={look.tenIcon}
        onChange={(tenIcon) => changeLook({ tenIcon })}
      />

      <Heading>Единица</Heading>
      <ColorSetting
        label="Цвет"
        value={look.oneColor}
        inherited={look.digits}
        clearLabel="как цифры"
        onChange={(oneColor) => changeLook({ oneColor })}
      />
      <IconSetting
        label="Значок единицы"
        digit="1"
        value={look.oneIcon}
        onChange={(oneIcon) => changeLook({ oneIcon })}
      />

      <Heading>Поверхность корпуса</Heading>
      <Typography variant="caption" color="text.secondary">
        Кнопки ставят все ползунки ниже в готовое сочетание, дальше каждый можно
        двигать отдельно.
      </Typography>
      <Choices
        label="Готовая поверхность"
        choices={FINISHES}
        names={FINISH_NAMES}
        onChange={(finish) => changeLook(FINISH_PRESETS[finish])}
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
      <LookSlider
        label="Блики"
        value={look.specular}
        onChange={(specular) => changeLook({ specular })}
      />
      <ColorSetting
        label="Цвет бликов"
        value={look.specularColor}
        onChange={(specularColor) => changeLook({ specularColor })}
      />
      <LookSlider
        label="Отражения"
        value={look.reflections}
        onChange={(reflections) => changeLook({ reflections })}
      />
      <LookSlider
        label="Лак"
        value={look.clearcoat}
        onChange={(clearcoat) => changeLook({ clearcoat })}
      />
      <LookSlider
        label="Матовость лака"
        value={look.clearcoatRoughness}
        onChange={(clearcoatRoughness) => changeLook({ clearcoatRoughness })}
      />
      <LookSlider
        label="Перелив"
        value={look.iridescence}
        onChange={(iridescence) => changeLook({ iridescence })}
      />
      <LookSlider
        label="Оттенок перелива"
        value={look.iridescenceHue}
        onChange={(iridescenceHue) => changeLook({ iridescenceHue })}
      />
      <LookSlider
        label="Бархат"
        value={look.sheen}
        onChange={(sheen) => changeLook({ sheen })}
      />
      <ColorSetting
        label="Цвет бархата"
        value={look.sheenColor}
        onChange={(sheenColor) => changeLook({ sheenColor })}
      />
      <LookSlider
        label="Прозрачность"
        value={look.transmission}
        onChange={(transmission) => changeLook({ transmission })}
      />
    </Stack>
  );
}
