/**
 * Script help for `speechSynthesis`.
 *
 * Chrome ships a Hindi voice and no Gujarati one, and Windows ships neither.
 * That is the ordinary case on a laptop and on a great many phones, so a
 * Gujarati reader would otherwise get silence from a button that promises
 * sound.
 */

/**
 * Gujarati and Devanagari are the same alphabet drawn twice. Both descend
 * from Brahmi, both order their letters by the same phonetics, and Unicode
 * laid the two blocks out to match sign for sign: every Gujarati character
 * sits exactly 0x180 above its Devanagari twin. U+0A97 is U+0917, the
 * matras line up, and so do the digits.
 */
const GU_TO_DEVANAGARI = 0x180;

/** The Gujarati block, U+0A80 to U+0AFF. */
const GUJARATI_BLOCK = /[\u0A80-\u0AFF]/g;

/**
 * Rewrites Gujarati into Devanagari so a Hindi voice can read it aloud.
 *
 * This is a transliteration, not a translation — the words stay Gujarati and
 * only the letters change, so a Gujarati listener hears their own sentence in
 * a Hindi accent. The two languages share nearly all of their phonology, so
 * every word survives the trip. An accent is a far smaller loss than silence.
 *
 * The few Gujarati signs with no Devanagari counterpart at the offset (the
 * rupee sign, the letter ZHA) are punctuation this app never prints; every
 * character in the Gujarati dictionary maps cleanly.
 */
export function guToDevanagari(text: string): string {
  return text.replace(GUJARATI_BLOCK, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - GU_TO_DEVANAGARI),
  );
}
