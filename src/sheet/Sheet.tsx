import { useState } from "react";

import DiceIcon from "@mui/icons-material/CasinoOutlined";
import CloseIcon from "@mui/icons-material/CloseRounded";

import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import {
  ARCHETYPES,
  BACKGROUNDS,
  CLANS,
  DISCIPLINES,
  FLAWS,
  MERITS,
  PATHS,
} from "./lists";
import {
  ABILITY_GROUPS,
  ATTRIBUTE_GROUPS,
  DAMAGE_NAMES,
  HEALTH_LEVELS,
  MAX_DAMAGE,
  MAX_DOTS,
  MAX_GENERATION,
  MAX_HUMANITY,
  MAX_LIST_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  MAX_WILLPOWER,
  MIN_GENERATION,
  NamedTrait,
  PHYSICAL_KEYS,
  PhysicalKey,
  Sheet as SheetData,
  TRAIT_NAMES,
  TraitKey,
  VIRTUE_KEYS,
  VIRTUE_NAMES,
  clickBloodDots,
  clickDots,
  getBlood,
} from "./model";

type Update = (change: (sheet: SheetData) => SheetData) => void;

/** Add dice to the pool of the tray, like the pool buttons this clears a finished roll */
function addDice(count: number) {
  useDiceControlsStore.getState().addToPool(count);
  const roll = useDiceRollStore.getState();
  if (roll.roll) {
    roll.clearRoll();
  }
}

/**
 * Button that adds the dice of a trait to the pool: a die icon and the name
 * of the trait, the whole thing is clickable.
 * Without a name it is just the icon, for traits whose name is being edited.
 */
function RollButton({
  dice,
  label,
  name,
}: {
  dice: number;
  /** What the trait is called for screen readers and the tooltip */
  label: string;
  /** The name to show next to the icon */
  name?: string;
}) {
  return (
    <button
      type="button"
      className={`sheet-roll${dice > 0 ? "" : " empty"}`}
      title={`${label}: добавить в пул ${dice}`}
      aria-label={`${label}: добавить в пул ${dice}`}
      onClick={() => dice > 0 && addDice(dice)}
    >
      <DiceIcon fontSize="inherit" />
      {name && <span>{name}</span>}
    </button>
  );
}

/**
 * A row of dots. `blood` dots follow the filled ones in another color.
 * `onClick` gets the index of the dot that was clicked.
 */
function Dots({
  label,
  value,
  blood = 0,
  max,
  disabled,
  onClick,
}: {
  label: string;
  value: number;
  blood?: number;
  max: number;
  disabled?: boolean;
  onClick: (index: number) => void;
}) {
  return (
    <div className="sheet-dots" role="group" aria-label={label}>
      {Array.from({ length: max }, (_, index) => (
        <button
          type="button"
          key={index}
          className={`sheet-dot${
            index < value ? " filled" : index < value + blood ? " blood" : ""
          }`}
          aria-label={`${label}: ${index + 1}`}
          disabled={disabled}
          onClick={() => onClick(index)}
        />
      ))}
    </div>
  );
}

/** Squares of a pool that is spent and refilled during the game, they work on a locked sheet too */
function Squares({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="sheet-squares" role="group" aria-label={label}>
      {Array.from({ length: max }, (_, index) => (
        <button
          type="button"
          key={index}
          className={`sheet-square${index < value ? " filled" : ""}`}
          aria-label={`${label}: ${index + 1}`}
          onClick={() => onChange(clickDots(value, index))}
        />
      ))}
    </div>
  );
}

/** Text field with suggestions from a list */
function TextField({
  label,
  value,
  list,
  placeholder,
  maxLength = MAX_SHORT_TEXT_LENGTH,
  disabled,
  className,
  onChange,
}: {
  label: string;
  value: string;
  list?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      className={className}
      aria-label={label}
      value={value}
      list={list}
      placeholder={disabled ? undefined : placeholder}
      maxLength={maxLength}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** An attribute or an ability: name, speciality, dice button, dots */
function TraitRow({
  traitKey,
  sheet,
  update,
}: {
  traitKey: TraitKey;
  sheet: SheetData;
  update: Update;
}) {
  const name = TRAIT_NAMES[traitKey];
  const attribute = traitKey in sheet.attributes;
  const physical = (PHYSICAL_KEYS as readonly string[]).includes(traitKey);
  const value = attribute
    ? sheet.attributes[traitKey as keyof SheetData["attributes"]]
    : sheet.abilities[traitKey as keyof SheetData["abilities"]];
  const blood = physical ? sheet.bloodDots[traitKey as PhysicalKey] : 0;
  const specialty = sheet.specialties[traitKey] || "";

  const [specialtyOpen, setSpecialtyOpen] = useState(false);

  function handleDotClick(index: number) {
    if (sheet.locked) {
      // On a locked sheet only blood can add dots and only to the physical attributes
      update((sheet) => ({
        ...sheet,
        bloodDots: {
          ...sheet.bloodDots,
          [traitKey]: clickBloodDots(value, blood, index),
        },
      }));
    } else if (attribute) {
      update((sheet) => ({
        ...sheet,
        attributes: { ...sheet.attributes, [traitKey]: clickDots(value, index) },
      }));
    } else {
      update((sheet) => ({
        ...sheet,
        abilities: { ...sheet.abilities, [traitKey]: clickDots(value, index) },
      }));
    }
  }

  function handleSpecialtyChange(text: string) {
    update((sheet) => {
      const specialties = { ...sheet.specialties };
      if (text) {
        specialties[traitKey] = text;
      } else {
        delete specialties[traitKey];
      }
      return { ...sheet, specialties };
    });
  }

  return (
    <>
      <div className="sheet-row">
        <div className="sheet-row-name">
          <RollButton dice={value + blood} label={name} name={name} />
          {/* On a locked sheet there is nothing to open without a speciality */}
          {(!sheet.locked || specialty) && (
            <button
              type="button"
              className={`sheet-icon-button sheet-arrow${
                specialty ? " has-specialty" : ""
              }`}
              title="Специализация"
              aria-label={`${name}: специализация`}
              aria-expanded={specialtyOpen}
              onClick={() => setSpecialtyOpen(!specialtyOpen)}
            >
              {specialtyOpen ? "▴" : "▾"}
            </button>
          )}
        </div>
        <Dots
          label={name}
          value={value}
          blood={blood}
          max={MAX_DOTS}
          disabled={sheet.locked && !physical}
          onClick={handleDotClick}
        />
      </div>
      {specialtyOpen ? (
        <div className="sheet-specialty">
          <TextField
            label={`${name}: специализация`}
            value={specialty}
            placeholder="специализация"
            disabled={sheet.locked}
            onChange={handleSpecialtyChange}
          />
        </div>
      ) : (
        specialty && <div className="sheet-specialty">{specialty}</div>
      )}
    </>
  );
}

/** Disciplines or backgrounds: traits with names picked by the player */
function NamedTraits({
  title,
  addLabel,
  list,
  traits,
  locked,
  onChange,
}: {
  title: string;
  addLabel: string;
  list: string;
  traits: NamedTrait[];
  locked: boolean;
  onChange: (traits: NamedTrait[]) => void;
}) {
  function change(index: number, update: Partial<NamedTrait>) {
    onChange(
      traits.map((trait, i) => (i === index ? { ...trait, ...update } : trait))
    );
  }

  return (
    <div>
      <div className="sheet-group-title">{title}</div>
      {traits.map((trait, index) => {
        const label = trait.name || `${title} ${index + 1}`;
        return (
          <div className="sheet-row" key={index}>
            <div className="sheet-row-name">
              {locked ? (
                <RollButton dice={trait.value} label={label} name={label} />
              ) : (
                <>
                  <RollButton dice={trait.value} label={label} />
                  <TextField
                    label={`${title} ${index + 1}`}
                    value={trait.name}
                    list={list}
                    onChange={(name) => change(index, { name })}
                  />
                </>
              )}
            </div>
            {!locked && (
              <button
                type="button"
                className="sheet-icon-button sheet-arrow"
                title="Удалить"
                aria-label={`${label}: удалить`}
                onClick={() => onChange(traits.filter((_, i) => i !== index))}
              >
                <CloseIcon fontSize="inherit" />
              </button>
            )}
            <Dots
              label={label}
              value={trait.value}
              max={MAX_DOTS}
              disabled={locked}
              onClick={(dot) =>
                change(index, { value: clickDots(trait.value, dot) })
              }
            />
          </div>
        );
      })}
      {!locked && traits.length < MAX_LIST_LENGTH && (
        <button
          type="button"
          className="sheet-add"
          onClick={() => onChange([...traits, { name: "", value: 0 }])}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

/** Merits or flaws: a list of texts */
function TextList({
  title,
  addLabel,
  list,
  items,
  locked,
  onChange,
}: {
  title: string;
  addLabel: string;
  list: string;
  items: string[];
  locked: boolean;
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="sheet-block">
      <div className="sheet-group-title">{title}</div>
      {items.map((item, index) => (
        <div className="sheet-row" key={index}>
          <div className="sheet-row-name">
            <TextField
              label={`${title} ${index + 1}`}
              value={item}
              list={list}
              disabled={locked}
              onChange={(text) =>
                onChange(items.map((item, i) => (i === index ? text : item)))
              }
            />
          </div>
          {!locked && (
            <button
              type="button"
              className="sheet-icon-button sheet-arrow"
              title="Удалить"
              aria-label={`${item || title}: удалить`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <CloseIcon fontSize="inherit" />
            </button>
          )}
        </div>
      ))}
      {!locked && items.length < MAX_LIST_LENGTH && (
        <button
          type="button"
          className="sheet-add"
          onClick={() => onChange([...items, ""])}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

const DAMAGE_SYMBOLS = ["", "/", "✕", "✱"];

function Health({ sheet, update }: { sheet: SheetData; update: Update }) {
  return (
    <div className="sheet-block sheet-health">
      <div className="sheet-group-title">Здоровье</div>
      {HEALTH_LEVELS.map((level, index) => {
        const damage = sheet.health[index];
        return (
          <div className="sheet-row" key={level.name}>
            <div className="sheet-row-name">
              <span>{level.name}</span>
            </div>
            <span className="sheet-penalty">{level.penalty}</span>
            <button
              type="button"
              className="sheet-square"
              title={DAMAGE_NAMES[damage]}
              aria-label={`${level.name}: ${DAMAGE_NAMES[damage]}`}
              onClick={() =>
                update((sheet) => ({
                  ...sheet,
                  health: sheet.health.map((value, i) =>
                    i === index ? (value >= MAX_DAMAGE ? 0 : value + 1) : value
                  ),
                }))
              }
            >
              <span>{DAMAGE_SYMBOLS[damage]}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Datalist({ id, names }: { id: string; names: string[] }) {
  return (
    <datalist id={id}>
      {names.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  );
}

/**
 * The body of a character sheet.
 * A locked sheet can't be edited: only its trackers work and the physical
 * attributes can get temporary dots for spent blood.
 */
export function Sheet({ sheet, update }: { sheet: SheetData; update: Update }) {
  const locked = sheet.locked;
  const blood = getBlood(sheet.generation);

  const set = <K extends keyof SheetData>(key: K, value: SheetData[K]) =>
    update((sheet) => ({ ...sheet, [key]: value }));

  const generations = [];
  for (let g = MIN_GENERATION; g <= MAX_GENERATION; g++) {
    generations.push(g);
  }

  return (
    <>
      <Datalist id="sheet-archetypes" names={ARCHETYPES} />
      <Datalist id="sheet-clans" names={CLANS} />
      <Datalist id="sheet-disciplines" names={DISCIPLINES} />
      <Datalist id="sheet-backgrounds" names={BACKGROUNDS} />
      <Datalist id="sheet-merits" names={MERITS} />
      <Datalist id="sheet-flaws" names={FLAWS} />
      <Datalist id="sheet-paths" names={PATHS} />

      <div className="sheet-profile">
        <label className="sheet-field">
          <span>Натура:</span>
          <TextField
            label="Натура"
            value={sheet.nature}
            list="sheet-archetypes"
            disabled={locked}
            onChange={(value) => set("nature", value)}
          />
        </label>
        <label className="sheet-field">
          <span>Клан:</span>
          <TextField
            label="Клан"
            value={sheet.clan}
            list="sheet-clans"
            disabled={locked}
            onChange={(value) => set("clan", value)}
          />
        </label>
        <label className="sheet-field">
          <span>Возраст:</span>
          <TextField
            label="Возраст"
            value={sheet.age}
            disabled={locked}
            onChange={(value) => set("age", value)}
          />
        </label>
        <label className="sheet-field">
          <span>Поколение:</span>
          <select
            aria-label="Поколение"
            value={sheet.generation}
            disabled={locked}
            onChange={(event) =>
              update((sheet) => {
                const generation = Number(event.target.value);
                return {
                  ...sheet,
                  generation,
                  bloodPool: Math.min(
                    sheet.bloodPool,
                    getBlood(generation).pool
                  ),
                };
              })
            }
          >
            {generations.map((generation) => (
              <option key={generation} value={generation}>
                {generation}-е
              </option>
            ))}
          </select>
        </label>
        <label className="sheet-field">
          <span>Опыт:</span>
          <TextField
            label="Опыт"
            value={sheet.experience}
            disabled={locked}
            onChange={(value) => set("experience", value)}
          />
        </label>
      </div>

      <div className="sheet-section-title">Характеристики</div>
      <div className="sheet-groups">
        {ATTRIBUTE_GROUPS.map((group) => (
          <div key={group.name}>
            <div className="sheet-group-title">{group.name}</div>
            {group.keys.map((key) => (
              <TraitRow key={key} traitKey={key} sheet={sheet} update={update} />
            ))}
          </div>
        ))}
      </div>

      <div className="sheet-section-title">Способности</div>
      <div className="sheet-groups">
        {ABILITY_GROUPS.map((group) => (
          <div key={group.name}>
            <div className="sheet-group-title">{group.name}</div>
            {group.keys.map((key) => (
              <TraitRow key={key} traitKey={key} sheet={sheet} update={update} />
            ))}
          </div>
        ))}
      </div>

      <div className="sheet-section-title">Преимущества</div>
      <div className="sheet-groups">
        <NamedTraits
          title="Дисциплины"
          addLabel="добавить дисциплину"
          list="sheet-disciplines"
          traits={sheet.disciplines}
          locked={locked}
          onChange={(disciplines) => set("disciplines", disciplines)}
        />
        <NamedTraits
          title="Факты биографии"
          addLabel="добавить факт биографии"
          list="sheet-backgrounds"
          traits={sheet.backgrounds}
          locked={locked}
          onChange={(backgrounds) => set("backgrounds", backgrounds)}
        />
        <div>
          <div className="sheet-group-title">Добродетели</div>
          {VIRTUE_KEYS.map((key) => (
            <div className="sheet-row" key={key}>
              <div className="sheet-row-name">
                <RollButton
                  dice={sheet.virtues[key]}
                  label={VIRTUE_NAMES[key]}
                  name={VIRTUE_NAMES[key]}
                />
              </div>
              <Dots
                label={VIRTUE_NAMES[key]}
                value={sheet.virtues[key]}
                max={MAX_DOTS}
                disabled={locked}
                onClick={(index) =>
                  update((sheet) => ({
                    ...sheet,
                    virtues: {
                      ...sheet.virtues,
                      [key]: clickDots(sheet.virtues[key], index),
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="sheet-section-title">Статус</div>
      <div className="sheet-groups">
        <div>
          <TextList
            title="Достоинства"
            addLabel="добавить достоинство"
            list="sheet-merits"
            items={sheet.merits}
            locked={locked}
            onChange={(merits) => set("merits", merits)}
          />
          <TextList
            title="Недостатки"
            addLabel="добавить недостаток"
            list="sheet-flaws"
            items={sheet.flaws}
            locked={locked}
            onChange={(flaws) => set("flaws", flaws)}
          />
        </div>
        <div>
          <div className="sheet-block">
            <div className="sheet-row">
              <div className="sheet-row-name">
                {locked ? (
                  <RollButton
                    dice={sheet.humanity}
                    label={sheet.path || "Человечность"}
                    name={sheet.path || "Человечность"}
                  />
                ) : (
                  <>
                    <RollButton
                      dice={sheet.humanity}
                      label={sheet.path || "Человечность"}
                    />
                    <TextField
                      label="Человечность или Путь"
                      value={sheet.path}
                      list="sheet-paths"
                      placeholder="Человечность"
                      onChange={(value) => set("path", value)}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="sheet-centered">
              <Dots
                label={sheet.path || "Человечность"}
                value={sheet.humanity}
                max={MAX_HUMANITY}
                disabled={locked}
                onClick={(index) =>
                  set("humanity", clickDots(sheet.humanity, index))
                }
              />
            </div>
          </div>
          <div className="sheet-block">
            <div className="sheet-row">
              <div className="sheet-row-name">
                <RollButton dice={sheet.willpower} label="Воля" name="Воля" />
              </div>
            </div>
            <div className="sheet-centered">
              <Dots
                label="Воля"
                value={sheet.willpower}
                max={MAX_WILLPOWER}
                disabled={locked}
                onClick={(index) =>
                  set("willpower", clickDots(sheet.willpower, index))
                }
              />
            </div>
            <Squares
              label="Запас воли"
              value={sheet.willpowerPool}
              max={MAX_WILLPOWER}
              onChange={(value) => set("willpowerPool", value)}
            />
          </div>
          <div className="sheet-block">
            <div className="sheet-group-title">Запас крови</div>
            <Squares
              label="Запас крови"
              value={sheet.bloodPool}
              max={blood.pool}
              onChange={(value) => set("bloodPool", value)}
            />
            <div className="sheet-hint">
              Предел траты в ход: {blood.perTurn}
            </div>
          </div>
        </div>
        <Health sheet={sheet} update={update} />
      </div>
    </>
  );
}
