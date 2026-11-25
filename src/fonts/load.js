// Register the embedded font subsets before any canvas draws with them.
import { FONTS, FONT_FLAVOR } from './fonts.js';
export const F_CAP = '"TG Serif"', F_TITLE = '"TG Title"', F_PLAQUE = '"TG Kai"';
let done = null;
export function loadFonts() {
  return done ??= (async () => { const mk = async (family, b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const f = new FontFace(family, bin.buffer); await f.load(); document.fonts.add(f); };
    await Promise.all([mk('TG Serif', FONTS.cap), mk('TG Title', FONTS.title), mk('TG Kai', FONTS.plaque)]); })();
}
