import { getPluginId } from "../plugin/getPluginId";

/**
 * TEMPORARY diagnostics (docs/TASKS.md, stage 1).
 * Lets the diagnostics page find out if this iframe is alive
 * and reachable from other iframes of the extension.
 */
export function heartbeatKey(name: string) {
  return getPluginId(`diag/heartbeat/${name}`);
}

export const DIAG_CHANNEL = getPluginId("diag/channel");

export interface Heartbeat {
  /** Random id generated once per page load, changes if the iframe is reloaded */
  boot: string;
  time: number;
}

export function readHeartbeat(name: string): Heartbeat | null {
  try {
    const raw = localStorage.getItem(heartbeatKey(name));
    return raw ? (JSON.parse(raw) as Heartbeat) : null;
  } catch {
    return null;
  }
}

export function startHeartbeat(name: string) {
  const boot = Math.random().toString(36).slice(2, 8);
  const beat = () => {
    try {
      const heartbeat: Heartbeat = { boot, time: Date.now() };
      localStorage.setItem(heartbeatKey(name), JSON.stringify(heartbeat));
    } catch {}
  };
  beat();
  setInterval(beat, 500);

  if (window.BroadcastChannel) {
    const channel = new BroadcastChannel(DIAG_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data === "ping") {
        channel.postMessage({ pong: name, boot });
      }
    };
  }
}
