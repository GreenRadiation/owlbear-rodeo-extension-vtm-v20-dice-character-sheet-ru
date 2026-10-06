import OBR from "@owlbear-rodeo/sdk";

import { getPluginId } from "../plugin/getPluginId";

/** The window of the editor of custom dice, see editor.tsx */
export const LOOK_EDITOR_ID = getPluginId("look-editor");
export const LOOK_EDITOR_WIDTH = 560;
const LOOK_EDITOR_HEIGHT = 940;
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
  await OBR.popover.open({
    id: LOOK_EDITOR_ID,
    url: `${import.meta.env.BASE_URL}editor.html?slot=${slot}`,
    width: LOOK_EDITOR_WIDTH,
    height: Math.min(LOOK_EDITOR_HEIGHT, height - MARGIN * 2),
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
