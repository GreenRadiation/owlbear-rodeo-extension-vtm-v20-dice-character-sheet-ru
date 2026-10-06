import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { TrayEnvironment } from "../tray/TrayEnvironment";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Checkbox from "@mui/material/Checkbox";
import Paper from "@mui/material/Paper";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Theme } from "@mui/material/styles";

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
import { LOOK_ASSETS } from "../materials/custom/assets";
import { FONTS } from "../materials/custom/fonts";
import { ICONS } from "../materials/custom/icons";
import { downloadText, readText } from "../sheet/files";
import { Die } from "../types/Die";
import {
  ONE_FACE,
  ONE_UP,
  TEN_FACE,
  TEN_UP,
  getFacingQuaternion,
} from "../previews/facing";

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

/** What every setting does, shown when the pointer rests on its name */
const HINTS = {
  body: "Основной цвет корпуса. Без узора корпус весь такого цвета; с узором этим цветом красятся его тёмные места.",
  body2:
    "Второй цвет корпуса: им красятся светлые места узора. Без узора не виден.",
  pattern:
    "Как два цвета корпуса смешиваются. «Градиент», «половины» и «кольца» идут от одного полюса куба к другому. Узоры готовых кубов берут рисунок с текстуры этого стиля: тёмное красится первым цветом, светлое вторым.",
  patternStrength:
    "Сколько второго цвета попадает на куб. На нуле узор не виден, на 100% светлые места узора целиком второго цвета.",
  patternScale:
    "Размер деталей узора: мелкие кольца или широкие, мелкий мрамор или крупный, мелкие крапинки или большие. Для узоров готовых кубов не действует.",
  patternBalance:
    "Какого цвета в узоре больше. Посередине узор как есть. Левее второй цвет остаётся только в самых ярких местах узора (у мрамора — редкие тонкие прожилки, у крапинок — мелкие и редкие), на нуле его нет совсем. Правее наоборот: на 100% весь корпус второго цвета. Размер узора пропорции не меняет, этот ползунок меняет.",
  unique:
    "Каждый куб броска получает свой вариант узора, а не один на всех. Узор остаётся тем же, меняется только его расположение. Другие игроки видят те же варианты.",
  digits:
    "Цвет всех цифр и значков, если у десятки и единицы нет своего цвета.",
  digits2:
    "Второй цвет цифр. С ним узор корпуса ложится и на цифры: там, где корпус был бы первого цвета, цифра первого цвета цифр, где второго — второго. У десятки и единицы со своим цветом узора нет.",
  outline:
    "Линия вокруг каждой цифры и значка. Помогает читать цифры на пёстром корпусе.",
  outlineWidth:
    "Толщина линии вокруг цифр. На максимуме около четверти толщины штриха цифры.",
  glow: "Цифры светятся своим цветом, как неоновые. На 100% они светятся даже в тени.",
  engraving:
    "Насколько заметен рельеф на краях цифр. Больше нуля цифры выглядят вдавленными, меньше нуля выступающими. Это игра света на краях, а не настоящая геометрия: форма куба не меняется.",
  bevel:
    "Ширина скоса на краю цифры. Узкий скос даёт резкую ступеньку, широкий — плавную подушку. Заметен только вместе с глубиной.",
  font: "Шрифт, которым написаны цифры. Файлы шрифтов лежат в репозитории расширения, новые добавляются туда.",
  digitsRoughness:
    "Шероховатость цифр и значков. Матовая краска около 80%, глянцевая эмаль ближе к нулю.",
  digitsMetalness:
    "Металличность цифр и значков. На 100% цифра отражает окружение как металл: с жёлтым цветом получается золото, со светло-серым серебро.",
  digitsCoated:
    "Лак и перелив корпуса ложатся и на цифры. Если снять, цифры и значки остаются обычной краской, что бы ни происходило с корпусом.",
  tenColor: "Свой цвет для десятки, чтобы она бросалась в глаза в лотке.",
  tenIcon: "Что стоит на грани десятки вместо «0».",
  oneColor: "Свой цвет для единицы.",
  oneIcon: "Что стоит на грани единицы вместо «1».",
  finish:
    "Готовое сочетание всех ползунков поверхности. Нажатие выставляет их все разом, потом каждый можно двигать отдельно.",
  roughness:
    "Шероховатость корпуса. На нуле зеркальная полировка, на 100% матовый, как мел. Решает, насколько размыты отражения и блики.",
  metalness:
    "Металличность корпуса. Металл не имеет своего цвета в отражениях: его цвет красит отражение. На 100% с тёмным цветом получается вороненая сталь, со светлым серебро.",
  specular:
    "Сила бликов на неметаллическом корпусе. Свет в лотке идёт сверху, оттуда же смотрит камера, поэтому на тёмных кубах сильные блики засвечивают верхние грани.",
  specularColor:
    "Оттенок бликов неметаллического корпуса. Обычно белый; цветные блики дают эффект цветной эмали.",
  reflections:
    "Сколько окружения отражает и ловит куб. 50% как у готовых кубов, меньше — темнее и спокойнее, больше — ярче.",
  clearcoat:
    "Слой прозрачного лака поверх корпуса, со своими бликами. Даёт вид полированного или покрытого смолой куба даже на матовом корпусе.",
  clearcoatRoughness:
    "Матовость лака: на нуле лак зеркальный, на 100% матовый, почти незаметный.",
  iridescence:
    "Перелив, как на мыльном пузыре или перламутре: цвет отражения зависит от угла. На 100% перелив виден на всём корпусе.",
  iridescenceHue:
    "Толщина плёнки перелива, а с ней и цвета, через которые он проходит. Это как масляная плёнка на воде: тонкая отливает золотом и синим, толще — зелёным и пурпурным, совсем толстая — частыми радужными полосами. Красный получается на тонкой плёнке, примерно 15–25% при среднем преломлении; шаг в 1% тут важен. Цвет зависит и от угла взгляда, и от цвета корпуса под плёнкой.",
  iridescenceIor:
    "Преломление плёнки перелива, от стекла до алмаза. Сдвигает все цвета перелива сразу и делает его резче или мягче; подбирается вместе с толщиной.",
  sheen:
    "Мягкое свечение по краям, как у бархата или шёлка. Светлеет там, где поверхность уходит от зрителя.",
  sheenColor: "Цвет бархатного свечения по краям.",
  transmission:
    "Сколько света проходит сквозь корпус. На 100% куб из цветного стекла; цифры остаются непрозрачными. Самый тяжёлый для видеокарты эффект.",
};

const PREVIEW_DIE: Die = { id: "preview", style: "CUSTOM", type: "D10" };
/** A little from above, as the tray is seen */
const TOWARDS_CAMERA = new THREE.Vector3(0, 0.45, 1).normalize();

/** A die that shows one of its faces to the camera and sways a little to catch the light */
function ShownDie({
  face,
  up,
  x,
  id,
}: {
  face: THREE.Vector3;
  /** The direction on the die the top of the digit of the face points to */
  up: THREE.Vector3;
  x: number;
  id: string;
}) {
  const ref = useRef<THREE.Group>(null);

  const rest = useMemo(
    () => getFacingQuaternion(face, TOWARDS_CAMERA, up),
    [face, up]
  );

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

  const die = useMemo(() => ({ ...PREVIEW_DIE, id }), [id]);

  return (
    <group ref={ref} position={[x, 0, 0]}>
      <Dice die={die} />
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
        top: -8,
        zIndex: 2,
        bgcolor: "#16171f",
        boxShadow: 4,
      }}
    >
      <Canvas camera={{ position: [0, 0.27, 0.6], fov: 28 }}>
        <Suspense fallback={null}>
          <TrayEnvironment />
          {/* Contexts don't reach into a canvas from the outside */}
          <DiceLookContext.Provider value={look}>
            <ShownDie face={TEN_FACE} up={TEN_UP} x={-0.13} id="preview-ten" />
            <ShownDie face={ONE_FACE} up={ONE_UP} x={0.13} id="preview-one" />
          </DiceLookContext.Provider>
        </Suspense>
      </Canvas>
    </Box>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle2" color="primary.light" mt={1.5}>
      {children}
    </Typography>
  );
}

/** The name of a setting, with what it does when the pointer rests on it */
function Label({
  text,
  hint,
  width,
}: {
  text: string;
  hint: string;
  width?: number;
}) {
  return (
    <Tooltip title={hint} placement="top-start" enterDelay={400}>
      <Typography
        width={width}
        flex={width ? undefined : 1}
        flexShrink={0}
        noWrap
        sx={{ cursor: "help" }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
}

function Choices<T extends string>({
  label,
  hint,
  value,
  choices,
  names,
  onChange,
}: {
  label: string;
  hint: string;
  /** Nothing is marked as picked without a value */
  value?: T;
  choices: readonly T[];
  names: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <Stack gap={0.5}>
      <Label text={label} hint={hint} />
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
    </Stack>
  );
}

function ColorSetting({
  label,
  hint,
  value,
  initial,
  onChange,
}: {
  label: string;
  hint: string;
  /** An empty string when the color is turned off */
  value: string;
  /**
   * The color a turned off color starts with when it is turned on.
   * Without it the color can't be turned off.
   */
  initial?: string;
  onChange: (value: string) => void;
}) {
  const optional = initial !== undefined;
  const on = !optional || value !== "";
  return (
    <Stack direction="row" alignItems="center" gap={1} minHeight={30}>
      {optional && (
        <Checkbox
          size="small"
          sx={{ p: 0.5, ml: -0.5 }}
          checked={on}
          aria-label={`${label}: включить`}
          onChange={(event) => onChange(event.target.checked ? initial : "")}
        />
      )}
      <Label text={label} hint={hint} />
      <input
        type="color"
        aria-label={label}
        value={value || initial || "#000000"}
        disabled={!on}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: 44,
          height: 28,
          padding: 0,
          border: "none",
          background: "none",
          cursor: on ? "pointer" : "default",
          opacity: on ? 1 : 0.3,
        }}
      />
    </Stack>
  );
}

function LookSlider({
  label,
  hint,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  // Shows the value while dragged, the die only changes on release
  const [dragged, setDragged] = useState<number | null>(null);
  const shown = dragged === null ? value : dragged;

  return (
    <Stack direction="row" alignItems="center" gap={2}>
      <Label text={label} hint={hint} width={150} />
      <Slider
        size="small"
        aria-label={label}
        value={shown}
        min={min}
        max={1}
        step={0.01}
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

function CheckSetting({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1} minHeight={30}>
      <Checkbox
        size="small"
        sx={{ p: 0.5, ml: -0.5 }}
        checked={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <Label text={label} hint={hint} />
    </Stack>
  );
}

/** Pick the digit itself or an icon that replaces it */
function IconSetting({
  label,
  hint,
  digit,
  value,
  onChange,
}: {
  label: string;
  hint: string;
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
    <Stack gap={0.5}>
      <Label text={label} hint={hint} />
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
    </Stack>
  );
}

/** The fonts the digits can be written in, with the digits of the original dice first */
function FontSetting({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const names = useMemo(() => {
    const names: Record<string, string> = { "": "Как у готовых кубов" };
    for (const font of FONTS) {
      names[font.id] = font.id;
    }
    return names;
  }, []);
  const choices = useMemo(() => ["", ...FONTS.map((font) => font.id)], []);
  if (FONTS.length === 0) {
    return null;
  }
  return (
    <Choices
      label="Шрифт"
      hint={HINTS.font}
      value={value}
      choices={choices}
      names={names}
      onChange={onChange}
    />
  );
}

/** The editor of the custom dice of one of the slots of the player */
export function DiceLookSettings({ slot }: { slot: number }) {
  const look = useDiceControlsStore((state) => state.looks[slot]);
  const changeLooks = useDiceControlsStore((state) => state.changeLook);
  const changeLook = (update: Partial<DiceLook>) => changeLooks(slot, update);

  // Looks are saved to files and loaded back as they are, sanitizeLook sorts out the rest
  const fileRef = useRef<HTMLInputElement>(null);
  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      changeLook(JSON.parse(await readText(file)));
    } catch {
      // Not a look: nothing changes
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, pt: 1 }}>
      <Stack gap={1}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography flex={1}>Свои кубы, набор {slot + 1}</Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => changeLook(randomLook(LOOK_ASSETS))}
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
        <Stack direction="row" gap={1}>
          <Button
            size="small"
            color="inherit"
            title="Сохранить этот набор в файл, чтобы поделиться им или вернуться к нему"
            onClick={() =>
              downloadText(
                `dice-look-${slot + 1}.json`,
                JSON.stringify(look, null, 2),
                "application/json"
              )
            }
          >
            Экспорт
          </Button>
          <Button
            size="small"
            color="inherit"
            title="Загрузить набор из файла. Заменяет текущий"
            onClick={() => fileRef.current?.click()}
          >
            Импорт
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImport}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Наведи на название настройки, чтобы прочитать, что она делает.
        </Typography>
        <LookPreview look={look} />

        <Heading>Корпус</Heading>
        <ColorSetting
          label="Цвет"
          hint={HINTS.body}
          value={look.body}
          onChange={(body) => changeLook({ body })}
        />
        <ColorSetting
          label="Второй цвет"
          hint={HINTS.body2}
          value={look.body2}
          onChange={(body2) => changeLook({ body2 })}
        />
        <Choices
          label="Узор"
          hint={HINTS.pattern}
          value={look.pattern}
          choices={DRAWN_PATTERNS}
          names={PATTERN_NAMES}
          onChange={(pattern) => changeLook({ pattern })}
        />
        <Choices
          label="Узор с готового куба"
          hint={HINTS.pattern}
          value={look.pattern}
          choices={TEXTURE_PATTERNS}
          names={PATTERN_NAMES}
          onChange={(pattern) => changeLook({ pattern })}
        />
        <LookSlider
          label="Сила узора"
          hint={HINTS.patternStrength}
          value={look.patternStrength}
          onChange={(patternStrength) => changeLook({ patternStrength })}
        />
        {!isTexturePattern(look.pattern) && (
          <LookSlider
            label="Размер узора"
            hint={HINTS.patternScale}
            value={look.patternScale}
            onChange={(patternScale) => changeLook({ patternScale })}
          />
        )}
        <LookSlider
          label="Баланс цветов"
          hint={HINTS.patternBalance}
          value={look.patternBalance}
          onChange={(patternBalance) => changeLook({ patternBalance })}
        />
        <CheckSetting
          label="У каждого куба свой вариант узора"
          hint={HINTS.unique}
          value={look.unique}
          onChange={(unique) => changeLook({ unique })}
        />

        <Heading>Цифры и значки</Heading>
        <ColorSetting
          label="Цвет"
          hint={HINTS.digits}
          value={look.digits}
          onChange={(digits) => changeLook({ digits })}
        />
        <ColorSetting
          label="Второй цвет с узором корпуса"
          hint={HINTS.digits2}
          value={look.digits2}
          initial={look.body2}
          onChange={(digits2) => changeLook({ digits2 })}
        />
        <ColorSetting
          label="Контур"
          hint={HINTS.outline}
          value={look.outline}
          initial="#000000"
          onChange={(outline) => changeLook({ outline })}
        />
        {look.outline && (
          <LookSlider
            label="Толщина контура"
            hint={HINTS.outlineWidth}
            value={look.outlineWidth}
            onChange={(outlineWidth) => changeLook({ outlineWidth })}
          />
        )}
        <FontSetting
          value={look.font}
          onChange={(font) => changeLook({ font })}
        />
        <LookSlider
          label="Свечение"
          hint={HINTS.glow}
          value={look.glow}
          onChange={(glow) => changeLook({ glow })}
        />
        <LookSlider
          label="Глубина"
          hint={HINTS.engraving}
          value={look.engraving}
          min={-1}
          onChange={(engraving) => changeLook({ engraving })}
        />
        <LookSlider
          label="Ширина скоса"
          hint={HINTS.bevel}
          value={look.bevel}
          onChange={(bevel) => changeLook({ bevel })}
        />
        <LookSlider
          label="Шероховатость"
          hint={HINTS.digitsRoughness}
          value={look.digitsRoughness}
          onChange={(digitsRoughness) => changeLook({ digitsRoughness })}
        />
        <LookSlider
          label="Металличность"
          hint={HINTS.digitsMetalness}
          value={look.digitsMetalness}
          onChange={(digitsMetalness) => changeLook({ digitsMetalness })}
        />
        <CheckSetting
          label="Лак и перелив корпуса ложатся на цифры"
          hint={HINTS.digitsCoated}
          value={look.digitsCoated}
          onChange={(digitsCoated) => changeLook({ digitsCoated })}
        />

        <Heading>Десятка</Heading>
        <ColorSetting
          label="Свой цвет"
          hint={HINTS.tenColor}
          value={look.tenColor}
          initial="#ffd24a"
          onChange={(tenColor) => changeLook({ tenColor })}
        />
        <IconSetting
          label="Значок"
          hint={HINTS.tenIcon}
          digit="0"
          value={look.tenIcon}
          onChange={(tenIcon) => changeLook({ tenIcon })}
        />

        <Heading>Единица</Heading>
        <ColorSetting
          label="Свой цвет"
          hint={HINTS.oneColor}
          value={look.oneColor}
          initial="#e23b3b"
          onChange={(oneColor) => changeLook({ oneColor })}
        />
        <IconSetting
          label="Значок"
          hint={HINTS.oneIcon}
          digit="1"
          value={look.oneIcon}
          onChange={(oneIcon) => changeLook({ oneIcon })}
        />

        <Heading>Поверхность корпуса</Heading>
        <Choices
          label="Готовая поверхность"
          hint={HINTS.finish}
          choices={FINISHES}
          names={FINISH_NAMES}
          onChange={(finish) => changeLook(FINISH_PRESETS[finish])}
        />
        <LookSlider
          label="Шероховатость"
          hint={HINTS.roughness}
          value={look.roughness}
          onChange={(roughness) => changeLook({ roughness })}
        />
        <LookSlider
          label="Металличность"
          hint={HINTS.metalness}
          value={look.metalness}
          onChange={(metalness) => changeLook({ metalness })}
        />
        <LookSlider
          label="Блики"
          hint={HINTS.specular}
          value={look.specular}
          onChange={(specular) => changeLook({ specular })}
        />
        <ColorSetting
          label="Цвет бликов"
          hint={HINTS.specularColor}
          value={look.specularColor}
          onChange={(specularColor) => changeLook({ specularColor })}
        />
        <LookSlider
          label="Отражения"
          hint={HINTS.reflections}
          value={look.reflections}
          onChange={(reflections) => changeLook({ reflections })}
        />
        <LookSlider
          label="Лак"
          hint={HINTS.clearcoat}
          value={look.clearcoat}
          onChange={(clearcoat) => changeLook({ clearcoat })}
        />
        {look.clearcoat > 0 && (
          <LookSlider
            label="Матовость лака"
            hint={HINTS.clearcoatRoughness}
            value={look.clearcoatRoughness}
            onChange={(clearcoatRoughness) =>
              changeLook({ clearcoatRoughness })
            }
          />
        )}
        <LookSlider
          label="Перелив"
          hint={HINTS.iridescence}
          value={look.iridescence}
          onChange={(iridescence) => changeLook({ iridescence })}
        />
        {look.iridescence > 0 && (
          <>
            <LookSlider
              label="Толщина плёнки"
              hint={HINTS.iridescenceHue}
              value={look.iridescenceHue}
              onChange={(iridescenceHue) => changeLook({ iridescenceHue })}
            />
            <LookSlider
              label="Преломление плёнки"
              hint={HINTS.iridescenceIor}
              value={look.iridescenceIor}
              onChange={(iridescenceIor) => changeLook({ iridescenceIor })}
            />
          </>
        )}
        <LookSlider
          label="Бархат"
          hint={HINTS.sheen}
          value={look.sheen}
          onChange={(sheen) => changeLook({ sheen })}
        />
        {look.sheen > 0 && (
          <ColorSetting
            label="Цвет бархата"
            hint={HINTS.sheenColor}
            value={look.sheenColor}
            onChange={(sheenColor) => changeLook({ sheenColor })}
          />
        )}
        <LookSlider
          label="Прозрачность"
          hint={HINTS.transmission}
          value={look.transmission}
          onChange={(transmission) => changeLook({ transmission })}
        />
      </Stack>
    </Paper>
  );
}
