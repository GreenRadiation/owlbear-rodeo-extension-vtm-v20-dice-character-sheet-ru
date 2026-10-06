import OBR from "@owlbear-rodeo/sdk";

import { getPluginId } from "../plugin/getPluginId";
import { useSettingsStore } from "./store";

/** The window of the editor of custom dice, see editor.tsx */
export const LOOK_EDITOR_ID = getPluginId("look-editor");
const MARGIN = 16;

/**
 * Open the editor of a slot of custom dice in a window of its own, next to
 * the tray: the dice can be rolled while they are being changed.
 * Only works inside Owlbear Rodeo.
 */
export async function openLookEditor(slot: number) {
  const [width, height] = await Promise.all([
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight(),
  ]);
  // The size the player dragged the window to last time, as far as the screen allows
  const { editorWidth, editorHeight } = useSettingsStore.getState().settings;
  await OBR.popover.open({
    id: LOOK_EDITOR_ID,
    url: `${import.meta.env.BASE_URL}editor.html?slot=${slot}`,
    width: Math.min(editorWidth, width - MARGIN * 2),
    height: Math.min(editorHeight, height - MARGIN * 2),
    // At the right edge of the screen, the tray usually sits at the left
    anchorReference: "POSITION",
    anchorPosition: { left: width - MARGIN, top: MARGIN },
    anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    disableClickAway: true,
    marginThreshold: MARGIN,
  });
}

export function closeLookEditor() {
  return OBR.popover.close(LOOK_EDITOR_ID);
}

/** Change the size of the window of the editor, from inside of it */
export function resizeLookEditor(width: number, height: number) {
  return Promise.all([
    OBR.popover.setWidth(LOOK_EDITOR_ID, width),
    OBR.popover.setHeight(LOOK_EDITOR_ID, height),
  ]);
}
