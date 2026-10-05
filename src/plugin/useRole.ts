import OBR from "@owlbear-rodeo/sdk";
import create from "zustand";

type Role = "GM" | "PLAYER";

const useRoleStore = create<{ role: Role }>()(() => ({ role: "PLAYER" }));

let watching = false;

/** Start following the role of the player, it can change while they are in the room */
function watch() {
  if (watching) {
    return;
  }
  watching = true;
  OBR.player.getRole().then((role) => useRoleStore.setState({ role }));
  OBR.player.onChange((player) => useRoleStore.setState({ role: player.role }));
}

/**
 * The role of the player using the extension.
 * Has to be used when the plugin is ready, a player until the role is known.
 */
export function useRole(): Role {
  watch();
  return useRoleStore((state) => state.role);
}
