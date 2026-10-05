import create from "zustand";

/**
 * The player whose tray is opened over the tray of this player.
 * Lets other parts of the window follow along:
 * the GM gets the character sheet of the player they are looking at.
 */
export const useFocusStore = create<{ playerId: string | null }>()(() => ({
  playerId: null,
}));
