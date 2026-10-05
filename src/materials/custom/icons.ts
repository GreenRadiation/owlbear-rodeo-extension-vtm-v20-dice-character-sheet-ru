/**
 * The icons that can replace the "0" and the "1" on custom dice.
 * Every SVG file in the `icons` folder is an icon, its id is the name of the file.
 * See the README in that folder for how to draw one.
 */
const files = import.meta.glob("./icons/*.svg", {
  eager: true,
  as: "url",
}) as Record<string, string>;

export interface DiceIcon {
  id: string;
  url: string;
}

export const ICONS: DiceIcon[] = Object.entries(files)
  .map(([path, url]) => ({
    id: path.replace(/^.*\//, "").replace(/\.svg$/, ""),
    url,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

export const ICON_IDS = ICONS.map((icon) => icon.id);

export function getIconUrl(id: string): string | undefined {
  return ICONS.find((icon) => icon.id === id)?.url;
}
