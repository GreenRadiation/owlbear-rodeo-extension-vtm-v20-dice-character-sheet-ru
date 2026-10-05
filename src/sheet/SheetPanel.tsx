import OBR, { Player } from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useRef, useState } from "react";

import LockedIcon from "@mui/icons-material/LockRounded";
import UnlockedIcon from "@mui/icons-material/LockOpenRounded";

import { PluginGate } from "../plugin/PluginGate";
import { useFocusStore } from "../plugin/focusStore";
import { getPluginId } from "../plugin/getPluginId";
import { useRoomMetadata } from "../plugin/roomStorage";
import { decodeSheet } from "./codec";
import { downloadText, readText, toFileName } from "./files";
import {
  MAX_NAME_LENGTH,
  Sheet as SheetData,
  createSheet,
  getBlood,
  setLocked,
} from "./model";
import { Section, Sheet } from "./Sheet";
import { PROFILE_SECTION, useSection } from "./useSection";
import { useSettingsStore } from "../settings/store";
import { SHEET_PREFIX, useSheet } from "./useSheet";
import { exportVtmcl, importVtmcl } from "./vtmcl";

import "./sheet.css";

/** How wide a column of the sheet is in the units of its font size: the text scales to keep it so */
const COLUMN_WIDTH_IN_EM = 17;
const MIN_FONT_SIZE = 7;
const MAX_FONT_SIZE = 15;

/** Longest the personal notes can get */
const MAX_NOTES_LENGTH = 100000;

/**
 * The window part with a character sheet.
 * A player sees their own sheet, the GM can open the sheet of anyone.
 */
export function SheetPanel({
  columns,
  style,
}: {
  /** How many columns the sheet is laid out in */
  columns: number;
  style?: React.CSSProperties;
}) {
  // The text of the sheet scales with the width of its columns
  const ref = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(12);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const size = element.clientWidth / columns / COLUMN_WIDTH_IN_EM;
      setFontSize(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [columns]);

  return (
    <div
      ref={ref}
      className="sheet"
      style={
        {
          ...style,
          fontSize: `${fontSize}px`,
          "--sheet-columns": columns,
        } as React.CSSProperties
      }
    >
      {OBR.isAvailable ? (
        <PluginGate>
          <RoomSheets />
        </PluginGate>
      ) : (
        <LocalSheet />
      )}
    </div>
  );
}

/**
 * The name of the character.
 * On a locked sheet it is a button that folds the profile below it,
 * on a sheet that is open for changes it is a text field.
 */
function SheetName({
  sheet,
  update,
}: {
  sheet: SheetData;
  update: (change: (sheet: SheetData) => SheetData) => void;
}) {
  const [folded, toggle] = useSection(PROFILE_SECTION);

  if (sheet.locked) {
    return (
      <button
        type="button"
        className="sheet-name"
        aria-expanded={!folded}
        onClick={toggle}
      >
        <span>{sheet.name || "Без имени"}</span>
        <span className="sheet-fold-arrow">{folded ? "▸" : "▾"}</span>
      </button>
    );
  }

  return (
    <input
      type="text"
      className="sheet-name"
      aria-label="Имя персонажа"
      placeholder="Имя персонажа"
      value={sheet.name}
      maxLength={MAX_NAME_LENGTH}
      onChange={(event) =>
        update((sheet) => ({ ...sheet, name: event.target.value }))
      }
    />
  );
}

/** A sheet that isn't stored anywhere, to work on the sheet outside of Owlbear Rodeo */
function LocalSheet() {
  const [sheet, setSheet] = useState<SheetData>(createSheet);
  const [notes, setNotes] = useState("");

  return (
    <>
      <div className="sheet-hint">Вне Owlbear Rodeo лист не сохраняется.</div>
      <div className="sheet-toolbar">
        <SheetName sheet={sheet} update={(change) => setSheet(change)} />
        <button
          type="button"
          className="sheet-button"
          onClick={() => setSheet(setLocked(sheet, !sheet.locked))}
        >
          {sheet.locked ? "Открыть" : "Закрыть"}
        </button>
      </div>
      <Sheet sheet={sheet} update={(change) => setSheet(change)} />
      <Notes notes={notes} onChange={setNotes} name={sheet.name} />
    </>
  );
}

/** Picks whose sheet is shown */
function RoomSheets() {
  const ownId = OBR.player.id;
  const metadata = useRoomMetadata();

  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    OBR.player.getRole().then(setRole);
    OBR.party.getPlayers().then(setPlayers);
    const unsubscribePlayer = OBR.player.onChange((player) =>
      setRole(player.role)
    );
    const unsubscribeParty = OBR.party.onChange(setPlayers);
    return () => {
      unsubscribePlayer();
      unsubscribeParty();
    };
  }, []);

  const [selectedId, setSelectedId] = useState(ownId);
  // While the GM looks at the tray of a player they get the sheet of that player
  const focusedId = useFocusStore((state) => state.playerId);
  // Only the GM can look at the sheets of others
  const playerId = role === "GM" ? focusedId || selectedId : ownId;

  /** Everyone the GM can pick: the players in the room and the sheets of players who are away */
  const options = useMemo(() => {
    const result = [{ id: ownId, label: "Мой лист" }];
    const seen = new Set([ownId]);
    for (const player of players) {
      if (!seen.has(player.id)) {
        seen.add(player.id);
        result.push({ id: player.id, label: player.name });
      }
    }
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith(SHEET_PREFIX)) {
        const id = key.slice(SHEET_PREFIX.length);
        if (!seen.has(id)) {
          seen.add(id);
          const name = decodeSheet(value)?.name;
          result.push({ id, label: `${name || "без имени"} (не в сети)` });
        }
      }
    }
    return result;
  }, [ownId, players, metadata]);

  return (
    <>
      {role === "GM" && options.length > 1 && (
        <div className="sheet-toolbar">
          <select
            aria-label="Чей лист показать"
            value={playerId}
            disabled={Boolean(focusedId)}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* The key starts the sheet from scratch when another player is picked */}
      <PlayerSheet
        key={playerId}
        playerId={playerId}
        own={playerId === ownId}
      />
    </>
  );
}

function PlayerSheet({ playerId, own }: { playerId: string; own: boolean }) {
  const { sheet, update, full } = useSheet(playerId);
  const [notes, setNotes] = useNotes();

  const [message, setMessage] = useState("");
  const sheetFileRef = useRef<HTMLInputElement>(null);

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const imported = importVtmcl(await readText(file));
    if (!imported) {
      setMessage("Этот файл не похож на лист персонажа с trechkalov.com.");
      return;
    }
    setMessage("");
    update(() => imported.sheet);
    // The notes of the file only fill in notes that are still empty
    if (own && imported.notes && !notes) {
      setNotes(imported.notes.slice(0, MAX_NOTES_LENGTH));
    }
  }

  function handleExport() {
    downloadText(
      `${toFileName(sheet.name, "character")}.json`,
      exportVtmcl(sheet, own ? notes : "", getBlood(sheet.generation).perTurn),
      "application/json"
    );
  }

  return (
    <>
      <div className="sheet-toolbar">
        <SheetName sheet={sheet} update={update} />
        <button
          type="button"
          className="sheet-button"
          title="Загрузить лист из файла, сохранённого на trechkalov.com. Заменяет текущий лист."
          disabled={sheet.locked}
          onClick={() => sheetFileRef.current?.click()}
        >
          Импорт
        </button>
        <input
          ref={sheetFileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
        <button
          type="button"
          className="sheet-button"
          title="Сохранить лист в файл, который открывается на trechkalov.com"
          onClick={handleExport}
        >
          Экспорт
        </button>
        <button
          type="button"
          className="sheet-icon-button"
          title={
            sheet.locked
              ? "Лист закрыт от изменений. Нажми, чтобы открыть"
              : "Лист можно менять. Нажми, чтобы закрыть"
          }
          aria-label={sheet.locked ? "открыть лист" : "закрыть лист"}
          aria-pressed={sheet.locked}
          onClick={() => update((sheet) => setLocked(sheet, !sheet.locked))}
        >
          {sheet.locked ? (
            <LockedIcon fontSize="inherit" />
          ) : (
            <UnlockedIcon fontSize="inherit" />
          )}
        </button>
      </div>
      {message && <div className="sheet-message">{message}</div>}
      {full && (
        <div className="sheet-message">
          В комнате не осталось места, последние изменения листа не сохранены.
          Место можно освободить в настройках, в разделе «Память комнаты».
        </div>
      )}
      <Sheet sheet={sheet} update={update} />
      {own && <Notes notes={notes} onChange={setNotes} name={sheet.name} />}
    </>
  );
}

/**
 * Personal notes of the player for this room.
 * Kept in the browser only: the room has no space for long texts
 * and the GM doesn't need to read them.
 */
function useNotes(): [string, (notes: string) => void] {
  const key = getPluginId(`notes/${OBR.room.id}`);
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  });

  function change(notes: string) {
    setNotes(notes);
    try {
      localStorage.setItem(key, notes);
    } catch {
      // Storage can be full or unavailable, the notes stay until the page is closed
    }
  }

  return [notes, change];
}

function Notes({
  notes,
  onChange,
  name,
}: {
  notes: string;
  onChange: (notes: string) => void;
  name: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  // The height the player dragged the field to is kept with the settings
  const height = useSettingsStore((state) => state.settings.notesHeight);
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  /**
   * Dragging the corner of the field is a press on the field that ends
   * with another height. The release can happen outside of the field.
   */
  function handlePointerDown(event: React.PointerEvent<HTMLTextAreaElement>) {
    const element = event.currentTarget;
    const pressHeight = element.offsetHeight;
    const handleRelease = () => {
      window.removeEventListener("pointerup", handleRelease);
      window.removeEventListener("mouseup", handleRelease);
      if (element.offsetHeight !== pressHeight) {
        changeSettings({ notesHeight: element.offsetHeight });
      }
    };
    window.addEventListener("pointerup", handleRelease);
    window.addEventListener("mouseup", handleRelease);
  }

  async function handleLoad(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      onChange((await readText(file)).slice(0, MAX_NOTES_LENGTH));
    }
  }

  return (
    <div className="sheet-notes">
      <Section id="notes" title="Заметки">
        <textarea
          aria-label="Заметки"
          placeholder="Инвентарь, имена, зацепки. Заметки видишь только ты, они хранятся в этом браузере."
          value={notes}
          maxLength={MAX_NOTES_LENGTH}
          style={height > 0 ? { height } : undefined}
          onChange={(event) => onChange(event.target.value)}
          onPointerDown={handlePointerDown}
        />
        <div className="sheet-notes-buttons">
          <button
            type="button"
            className="sheet-button"
            title="Заменить заметки текстом из файла"
            onClick={() => fileRef.current?.click()}
          >
            Загрузить из TXT
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="text/plain,.txt"
            hidden
            onChange={handleLoad}
          />
          <button
            type="button"
            className="sheet-button"
            disabled={!notes}
            onClick={() =>
              downloadText(
                `${toFileName(name, "character")}_notes.txt`,
                notes,
                "text/plain"
              )
            }
          >
            Сохранить в TXT
          </button>
        </div>
      </Section>
    </div>
  );
}
