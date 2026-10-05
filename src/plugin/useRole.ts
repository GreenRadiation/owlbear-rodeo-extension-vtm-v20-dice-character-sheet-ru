import OBR from "@owlbear-rodeo/sdk";
import create from "zustand";

type Role = "GM" | "PLAYER";

const useRoleStore = create<{ role: Role }>()(() => ({ role: "PLAYER" }));

let watching = false;

/** Start following the role of the player, it can change while they are in the room */
function watch() {
  if (watching || !OBR.isAvailable) {
    return;
  }
  watching = true;
  OBR.onReady(() => {
    OBR.player.getRole().then((role) => useRoleStore.setState({ role }));
    OBR.player.onChange((player) =>
      useRoleStore.setState({ role: player.role })
    );
  });
}

/**
 * The role of the player using the extension.
 * A player until the role is known and outside of Owlbear Rodeo.
 */
export function useRole(): Role {
  watch();
  return useRoleStore((state) => state.role);
}
