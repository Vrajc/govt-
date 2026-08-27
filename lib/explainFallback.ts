import type { ErrorCode, Lang } from "./types";

export interface Explanation {
  reason: string;
  action: string;
}

/**
 * The whole rejection explainer, hardcoded, six codes across three languages.
 *
 * This ships FIRST and the OpenAI call is layered on top of it — so pulling
 * the API key out degrades the app to exactly this, and nothing visibly
 * breaks. It is also what gets served when the model returns something
 * malformed, slow, or off-policy.
 *
 * Same copy rules as the UI: two short sentences, everyday words, never
 * blame the person, never apologise.
 */
export const FALLBACK: Record<ErrorCode, Record<Lang, Explanation>> = {
  ERR_FACE_QUALITY_LOW: {
    en: {
      reason: "The photo was too dark for the system to match your face.",
      action: "Try again facing a window, in the daytime.",
    },
    hi: {
      reason: "फ़ोटो इतनी अँधेरी थी कि चेहरा पहचान में नहीं आया.",
      action: "दिन में, खिड़की की तरफ़ मुँह करके दोबारा लीजिए.",
    },
    gu: {
      reason: "ફોટો એટલો અંધારો હતો કે ચહેરો ઓળખાયો નહીં.",
      action: "દિવસે, બારી સામે મોઢું રાખીને ફરી પાડો.",
    },
  },

  ERR_LIVENESS_FAIL: {
    en: {
      reason: "The system could not tell that it was a live person in the photo.",
      action: "Look straight at the camera, keep your eyes open, and take it again.",
    },
    hi: {
      reason: "मशीन यह नहीं समझ पाई कि फ़ोटो में सामने बैठा इंसान है.",
      action: "सीधे कैमरे की तरफ़ देखिए, आँखें खुली रखिए, और दोबारा लीजिए.",
    },
    gu: {
      reason: "મશીન સમજી ન શકી કે ફોટામાં સામે બેઠેલી વ્યક્તિ છે.",
      action: "સીધા કૅમેરા સામે જુઓ, આંખો ખુલ્લી રાખો, અને ફરી પાડો.",
    },
  },

  ERR_AADHAAR_NAME_MISMATCH: {
    en: {
      reason: "The name on the pension slip is written differently on the Aadhaar card.",
      action: "Type the name exactly as it appears on the Aadhaar card, then send it again.",
    },
    hi: {
      reason: "पेंशन की पर्ची पर नाम आधार कार्ड से अलग लिखा है.",
      action: "आधार कार्ड पर जैसा नाम लिखा है, बिल्कुल वैसा ही लिखकर दोबारा भेजिए.",
    },
    gu: {
      reason: "પેન્શનની ચિઠ્ઠી પરનું નામ આધાર કાર્ડ કરતાં જુદું લખેલું છે.",
      action: "આધાર કાર્ડ પર જેમ નામ લખ્યું છે એમ જ લખીને ફરી મોકલો.",
    },
  },

  ERR_PPO_NOT_FOUND: {
    en: {
      reason: "That PPO number is not in the pension office records.",
      action: "Check the number on the pension slip, one digit at a time, and send it again.",
    },
    hi: {
      reason: "यह पीपीओ नंबर पेंशन दफ़्तर के रिकॉर्ड में नहीं है.",
      action: "पेंशन की पर्ची पर लिखा नंबर एक-एक अंक मिलाकर दोबारा भेजिए.",
    },
    gu: {
      reason: "આ પીપીઓ નંબર પેન્શન કચેરીના રેકોર્ડમાં નથી.",
      action: "પેન્શનની ચિઠ્ઠી પરનો નંબર એક-એક આંકડો મેળવીને ફરી મોકલો.",
    },
  },

  ERR_FACE_NOT_CENTERED: {
    en: {
      reason: "Part of the face was outside the picture.",
      action: "Hold the phone at eye level so the whole face fits inside the oval.",
    },
    hi: {
      reason: "चेहरे का कुछ हिस्सा फ़ोटो से बाहर रह गया.",
      action: "फ़ोन आँखों की सीध में रखिए ताकि पूरा चेहरा गोले के अंदर आ जाए.",
    },
    gu: {
      reason: "ચહેરાનો થોડો ભાગ ફોટાની બહાર રહી ગયો.",
      action: "ફોન આંખની સીધમાં રાખો જેથી આખો ચહેરો ગોળાની અંદર આવી જાય.",
    },
  },

  ERR_DUPLICATE_SUBMISSION: {
    en: {
      reason: "This was already sent once today, so the second one was set aside.",
      action: "Nothing to do. Wait for the message about the first one.",
    },
    hi: {
      reason: "यह आज एक बार भेजा जा चुका है, इसलिए दूसरा अलग रख दिया गया.",
      action: "कुछ नहीं करना. पहले वाले का मैसेज आने का इंतज़ार कीजिए.",
    },
    gu: {
      reason: "આ આજે એક વાર મોકલાઈ ગયું છે, એટલે બીજું બાજુ પર મૂક્યું.",
      action: "કશું કરવાનું નથી. પહેલાનો મેસેજ આવે એની રાહ જુઓ.",
    },
  },
};

export function fallbackExplain(code: ErrorCode, lang: Lang): Explanation {
  return FALLBACK[code]?.[lang] ?? FALLBACK.ERR_FACE_QUALITY_LOW[lang];
}

/**
 * Assisted mode: the same two sentences, aimed at the person holding the
 * phone rather than the pensioner. Only the photo codes change — the rest
 * read the same either way.
 */
export function toAssisted(text: Explanation, lang: Lang): Explanation {
  const swap: Record<Lang, [RegExp, string][]> = {
    en: [
      [/\byour face\b/gi, "their face"],
      [/\byour eyes\b/gi, "their eyes"],
      [/\bthe face\b/gi, "their face"],
      [/\bLook straight at the camera\b/g, "Ask them to look straight at the camera"],
      [/\bkeep your eyes open\b/gi, "ask them to keep their eyes open"],
    ],
    hi: [
      [/सीधे कैमरे की तरफ़ देखिए/g, "उनसे कहिए कि सीधे कैमरे की तरफ़ देखें"],
      [/आँखें खुली रखिए/g, "आँखें खुली रखने को कहिए"],
    ],
    gu: [
      [/સીધા કૅમેરા સામે જુઓ/g, "એમને કહો કે સીધા કૅમેરા સામે જુએ"],
      [/આંખો ખુલ્લી રાખો/g, "આંખો ખુલ્લી રાખવાનું કહો"],
    ],
  };

  const apply = (s: string) =>
    swap[lang].reduce((acc, [re, to]) => acc.replace(re, to), s);

  return { reason: apply(text.reason), action: apply(text.action) };
}
