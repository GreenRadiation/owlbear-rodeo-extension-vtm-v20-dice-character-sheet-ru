import * as THREE from "three";

/**
 * The fonts the digits of custom dice can be written in.
 * Every font file in the `fonts` folder is one, its id is the name of the file.
 * See the README in that folder.
 */
const files = import.meta.glob("./fonts/*.{ttf,otf,woff,woff2}", {
  eager: true,
  as: "url",
}) as Record<string, string>;

export interface DiceFont {
  id: string;
  url: string;
  /** The name the font is known by to the browser once it is loaded */
  family: string;
}

export const FONTS: DiceFont[] = Object.entries(files)
  .map(([path, url]) => {
    const id = path.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
    return { id, url, family: `v20-dice-${id}` };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const FONT_IDS = FONTS.map((font) => font.id);

export function getFont(id: string): DiceFont | undefined {
  return FONTS.find((font) => font.id === id);
}

/**
 * Loads a font for the browser to draw with, in the shape of a three.js loader
 * so that react-three-fiber's `useLoader` can wait for it.
 * Takes the id of a font and gives its family name; an empty id gives an empty name.
 */
export class DiceFontLoader extends THREE.Loader {
  load(
    id: string,
    onLoad: (family: string) => void,
    _onProgress?: unknown,
    onError?: (error: unknown) => void
  ) {
    const font = getFont(id);
    if (!font) {
      onLoad("");
      return;
    }
    const face = new FontFace(font.family, `url(${font.url})`);
    face.load().then((loaded) => {
      document.fonts.add(loaded);
      onLoad(font.family);
    }, onError);
  }
}
