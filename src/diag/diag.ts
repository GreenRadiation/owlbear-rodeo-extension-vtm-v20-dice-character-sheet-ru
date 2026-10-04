/**
 * TEMPORARY diagnostics (docs/TASKS.md, stage 1).
 * Measures the limits of the Owlbear Rodeo SDK that the storage design depends on.
 */
import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../plugin/getPluginId";
import { DIAG_CHANNEL, readHeartbeat } from "./heartbeat";

const PROBE_KEY = getPluginId("diag/probe");
const PLAYER_MARK_KEY = getPluginId("diag/player-mark");
const LOCAL_MARK_KEY = getPluginId("diag/local-mark");

const out = document.getElementById("out") as HTMLTextAreaElement;
const buttons = Array.from(document.querySelectorAll("button"));
const lines: string[] = [];

function log(line = "") {
  lines.push(line);
  out.value = lines.join("\n");
  out.scrollTop = out.scrollHeight;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const utf8 = (value: string) => new TextEncoder().encode(value).length;

function size(value: unknown) {
  const json = JSON.stringify(value) ?? "";
  return `${json.length} симв. / ${utf8(json)} байт`;
}

function describeError(error: unknown) {
  try {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`нет ответа за ${ms} мс`)), ms)
    ),
  ]);
}

/** Run one step so that a failure is logged and doesn't stop the rest */
async function step(label: string, run: () => Promise<string>) {
  try {
    log(`${label}: ${await run()}`);
  } catch (error) {
    log(`${label}: ОШИБКА ${describeError(error)}`);
  }
}

async function busy(run: () => Promise<void>) {
  buttons.forEach((button) => (button.disabled = true));
  try {
    await run();
    log("готово");
  } catch (error) {
    log(`ПРЕРВАНО: ${describeError(error)}`);
  }
  log();
  buttons.forEach((button) => (button.disabled = false));
}

function heartbeatAge(name: string) {
  const heartbeat = readHeartbeat(name);
  if (!heartbeat) {
    return "нет";
  }
  return `${Date.now() - heartbeat.time} мс назад, boot ${heartbeat.boot}`;
}

async function environment() {
  log(`=== Окружение, ${new Date().toISOString()}`);
  log(`userAgent: ${navigator.userAgent}`);
  await step("роль", () => OBR.player.getRole());
  await step(
    "viewport Owlbear",
    async () =>
      `${await OBR.viewport.getWidth()} x ${await OBR.viewport.getHeight()}`
  );
  log(
    `окно диагностики: ${window.innerWidth} x ${window.innerHeight}, экран: ${screen.width} x ${screen.height}, dpr ${window.devicePixelRatio}`
  );
  await step("лоток открыт", async () => String(await OBR.action.isOpen()));
  await step("сцена открыта", async () => String(await OBR.scene.isReady()));

  await step("метаданные комнаты", async () => {
    const metadata = await OBR.room.getMetadata();
    const rows = Object.entries(metadata).map(
      ([key, value]) => `\n  ${key}: ${size(value)}`
    );
    return `ключей ${rows.length}, всего ${size(metadata)}${rows.join("")}`;
  });

  await step("localStorage", async () => {
    const previous = localStorage.getItem(LOCAL_MARK_KEY);
    localStorage.setItem(LOCAL_MARK_KEY, previous ?? new Date().toISOString());
    return previous ? `метка с ${previous}` : "метки не было, поставил";
  });

  await step("метаданные игрока с прошлого запуска", async () => {
    const metadata = await OBR.player.getMetadata();
    const previous = metadata[PLAYER_MARK_KEY];
    await OBR.player.setMetadata({
      [PLAYER_MARK_KEY]: new Date().toISOString(),
    });
    return previous ? `метка с ${previous}` : "метки не было, поставил";
  });

  log(`heartbeat лотка: ${heartbeatAge("tray")}`);
  log(`heartbeat фоновой страницы: ${heartbeatAge("background")}`);

  await step("BroadcastChannel", async () => {
    if (!window.BroadcastChannel) {
      return "не поддерживается";
    }
    const channel = new BroadcastChannel(DIAG_CHANNEL);
    const answers: string[] = [];
    channel.onmessage = (event) => {
      if (event.data?.pong) {
        answers.push(`${event.data.pong} (boot ${event.data.boot})`);
      }
    };
    channel.postMessage("ping");
    await sleep(700);
    channel.close();
    return answers.length ? `ответили: ${answers.join(", ")}` : "никто не ответил";
  });
  log();
}

async function trayTest() {
  log("=== 1. Лоток: живёт ли его окно, когда оно свёрнуто");
  const state = async () =>
    `открыт=${await OBR.action.isOpen()}, heartbeat ${heartbeatAge("tray")}`;
  log(`сейчас: ${await state()}`);
  await OBR.action.close();
  for (let second = 1; second <= 5; second++) {
    await sleep(1000);
    log(`свёрнут, +${second} с: ${await state()}`);
  }
  await OBR.action.open();
  for (let second = 1; second <= 3; second++) {
    await sleep(1000);
    log(`развёрнут, +${second} с: ${await state()}`);
  }
}

type Target = {
  get: () => Promise<Record<string, unknown>>;
  set: (update: Record<string, unknown>) => Promise<void>;
};

const room: Target = {
  get: () => OBR.room.getMetadata(),
  set: (update) => OBR.room.setMetadata(update),
};
const player: Target = {
  get: () => OBR.player.getMetadata(),
  set: (update) => OBR.player.setMetadata(update),
};
const scene: Target = {
  get: () => OBR.scene.getMetadata(),
  set: (update) => OBR.scene.setMetadata(update),
};

/** Write the probe key and read it back. Returns an error text or null on success */
async function write(target: Target, value: string | undefined) {
  try {
    await withTimeout(target.set({ [PROBE_KEY]: value }), 8000);
  } catch (error) {
    return describeError(error);
  }
  await sleep(250);
  const back = (await target.get())[PROBE_KEY];
  if (value === undefined) {
    return back === undefined ? null : "ключ не удалился";
  }
  if (typeof back !== "string" || back.length !== value.length) {
    const got = typeof back === "string" ? `${back.length} симв.` : typeof back;
    return `записалось без ошибки, но прочиталось другое (${got})`;
  }
  return null;
}

async function cleanup(target: Target, label: string) {
  const error = await write(target, undefined);
  if (error) {
    log(`${label}: удаление через undefined не сработало (${error}), пишу пустую строку`);
    await write(target, "");
  } else {
    log(`${label}: тестовый ключ удалён через undefined`);
  }
}

/** Binary search for the largest value of the probe key the room accepts */
async function probeRoom(label: string, char: string) {
  let low = 0;
  let high = 40000;
  while (high - low > 16) {
    const middle = (low + high) >> 1;
    const error = await write(room, char.repeat(middle));
    log(`  ${label}, ${middle} симв.: ${error ? `отказ (${error})` : "ok"}`);
    if (error) {
      high = middle;
    } else {
      low = middle;
    }
    await sleep(200);
  }
  await write(room, char.repeat(low));
  log(
    `  ${label}: максимум около ${low} симв. в ключе; вся комната при этом ${size(
      await room.get()
    )}`
  );
  return low;
}

async function roomTest() {
  log("=== 2. Лимит метаданных комнаты");
  try {
    log(`комната до теста: ${size(await room.get())}`);
    const latin = await probeRoom("латиница", "a");
    await probeRoom("кириллица", "я");

    // Check that a rejected write leaves the previous value untouched
    const kept = "a".repeat(Math.max(0, latin - 2000));
    await write(room, kept);
    const error = await write(room, "a".repeat(latin + 5000));
    const back = (await room.get())[PROBE_KEY];
    const intact = typeof back === "string" && back.length === kept.length;
    log(
      `запись сверх лимита: ${error ?? "прошла?!"}; старое значение на месте: ${
        intact ? "да" : "НЕТ"
      }`
    );
  } finally {
    await cleanup(room, "комната");
    log(`комната после теста: ${size(await room.get())}`);
  }
}

async function sizesTest(target: Target, label: string) {
  try {
    for (const length of [4000, 16000, 64000]) {
      const error = await write(target, "a".repeat(length));
      log(`${label}, ${length} симв.: ${error ? `отказ (${error})` : "ok"}`);
      if (error) {
        break;
      }
      await sleep(200);
    }
  } finally {
    await cleanup(target, label);
  }
}

async function otherTest() {
  log("=== 3. Метаданные игрока и сцены");
  await sizesTest(player, "игрок");
  if (await OBR.scene.isReady()) {
    await sizesTest(scene, "сцена");
  } else {
    log("сцена не открыта, пропускаю (открой любую сцену и нажми ещё раз)");
  }
}

function button(id: string) {
  return document.getElementById(id) as HTMLButtonElement;
}

button("tray").onclick = () => busy(trayTest);
button("room").onclick = () => busy(roomTest);
button("other").onclick = () => busy(otherTest);
button("select").onclick = () => {
  out.focus();
  out.select();
};
button("close").onclick = () => OBR.modal.close(getPluginId("diag/modal"));

if (OBR.isAvailable) {
  OBR.onReady(() => busy(environment));
} else {
  log("Эта страница работает только внутри Owlbear Rodeo.");
}
