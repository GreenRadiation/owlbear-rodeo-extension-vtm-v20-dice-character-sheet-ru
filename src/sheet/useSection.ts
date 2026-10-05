import { useSettingsStore } from "../settings/store";

/** The profile of the character under its name, only folds on a locked sheet */
export const PROFILE_SECTION = "profile";

/**
 * If a section of the sheet is folded and the function that folds and unfolds it.
 * Personal and kept in the browser with the settings: the same for every
 * sheet the player looks at, nobody else sees or changes it.
 */
export function useSection(id: string): [boolean, () => void] {
  const folded = useSettingsStore((state) =>
    state.settings.foldedSections.includes(id)
  );

  function toggle() {
    const { settings, changeSettings } = useSettingsStore.getState();
    const sections = settings.foldedSections;
    changeSettings({
      foldedSections: sections.includes(id)
        ? sections.filter((section) => section !== id)
        : [...sections, id],
    });
  }

  return [folded, toggle];
}
