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

  /* ---------------- the wider catalogue ---------------- */

  ERR_BPL_NOT_LISTED: {
    en: {
      reason: "Your household was not found on the BPL list at the village office.",
      action: "Ask the Talati to check the list, then send it again.",
    },
    hi: {
      reason: "गाँव के दफ़्तर की बीपीएल सूची में आपका घर नहीं मिला.",
      action: "तलाटी से सूची दिखवा लीजिए, फिर दोबारा भेजिए.",
    },
    gu: {
      reason: "ગામની કચેરીની બીપીએલ યાદીમાં તમારું ઘર મળ્યું નહીં.",
      action: "તલાટી પાસે યાદી તપાસાવી લો, પછી ફરી મોકલો.",
    },
  },

  ERR_AGE_PROOF_UNCLEAR: {
    en: {
      reason: "The date of birth on your paper could not be read.",
      action: "Take the photo again in good light, with the whole page inside the frame.",
    },
    hi: {
      reason: "आपके काग़ज़ पर लिखी जन्म तारीख़ पढ़ी नहीं जा सकी.",
      action: "अच्छी रोशनी में, पूरा पन्ना फ़ोटो में आए, ऐसे दोबारा लीजिए.",
    },
    gu: {
      reason: "તમારા કાગળ પરની જન્મ તારીખ વંચાઈ નહીં.",
      action: "સારા અજવાળામાં, આખું પાનું ફોટામાં આવે એમ ફરી પાડો.",
    },
  },

  ERR_DEATH_CERT_UNCLEAR: {
    en: {
      reason: "The death certificate could not be read properly.",
      action: "Photograph the whole page flat, in daylight, and send it again.",
    },
    hi: {
      reason: "मृत्यु प्रमाणपत्र ठीक से पढ़ा नहीं जा सका.",
      action: "पूरा पन्ना सीधा रखकर, दिन की रोशनी में फ़ोटो लेकर दोबारा भेजिए.",
    },
    gu: {
      reason: "મરણનું પ્રમાણપત્ર બરાબર વંચાયું નહીં.",
      action: "આખું પાનું સીધું રાખીને, દિવસના અજવાળામાં ફોટો પાડીને ફરી મોકલો.",
    },
  },

  ERR_DISABILITY_CERT: {
    en: {
      reason: "The disability paper did not show a government hospital stamp.",
      action: "Get it stamped at the government hospital, then send it again.",
    },
    hi: {
      reason: "दिव्यांगता के काग़ज़ पर सरकारी अस्पताल की मुहर नहीं दिखी.",
      action: "सरकारी अस्पताल से मुहर लगवाकर दोबारा भेजिए.",
    },
    gu: {
      reason: "દિવ્યાંગતાના કાગળ પર સરકારી દવાખાનાનો સિક્કો દેખાયો નહીં.",
      action: "સરકારી દવાખાનેથી સિક્કો મરાવીને ફરી મોકલો.",
    },
  },

  ERR_UAN_NOT_FOUND: {
    en: {
      reason: "That UAN number is not in the PF office records.",
      action: "Check it against an old PF slip, or leave it empty and send again.",
    },
    hi: {
      reason: "यह यूएएन नंबर पीएफ़ दफ़्तर के रिकॉर्ड में नहीं है.",
      action: "पुरानी पीएफ़ पर्ची से मिला लीजिए, या खाली छोड़कर दोबारा भेजिए.",
    },
    gu: {
      reason: "આ યુએએન નંબર પીએફ કચેરીના રેકોર્ડમાં નથી.",
      action: "જૂની પીએફ ચિઠ્ઠી સાથે મેળવી લો, કે ખાલી છોડીને ફરી મોકલો.",
    },
  },

  ERR_KYC_PENDING: {
    en: {
      reason: "Your Aadhaar and bank account are not yet linked at the PF office.",
      action: "Ask the PF office or your old company to link them, then send it again.",
    },
    hi: {
      reason: "पीएफ़ दफ़्तर में आपका आधार और बैंक खाता अभी जुड़े नहीं हैं.",
      action: "पीएफ़ दफ़्तर या पुरानी कंपनी से जुड़वाकर दोबारा भेजिए.",
    },
    gu: {
      reason: "પીએફ કચેરીમાં તમારો આધાર અને બૅન્ક ખાતું હજી જોડાયાં નથી.",
      action: "પીએફ કચેરી કે જૂની કંપની પાસે જોડાવીને ફરી મોકલો.",
    },
  },

  ERR_EXIT_DATE_MISSING: {
    en: {
      reason: "Your old company has not yet said which day you stopped work.",
      action: "Ring them and ask them to fill in that date, then send it again.",
    },
    hi: {
      reason: "आपकी पुरानी कंपनी ने अभी तक नहीं बताया कि आपने काम किस दिन छोड़ा.",
      action: "उन्हें फ़ोन करके वह तारीख़ भरवाइए, फिर दोबारा भेजिए.",
    },
    gu: {
      reason: "તમારી જૂની કંપનીએ હજી જણાવ્યું નથી કે તમે કામ કયા દિવસે છોડ્યું.",
      action: "એમને ફોન કરીને એ તારીખ ભરાવો, પછી ફરી મોકલો.",
    },
  },

  ERR_SERVICE_BOOK: {
    en: {
      reason: "Your office has not sent the service book page yet.",
      action: "Ask your office to send it, then this will move on its own.",
    },
    hi: {
      reason: "आपके दफ़्तर ने सेवा पुस्तिका का पन्ना अभी नहीं भेजा.",
      action: "दफ़्तर से भिजवा दीजिए, उसके बाद यह अपने आप आगे बढ़ जाएगा.",
    },
    gu: {
      reason: "તમારી કચેરીએ સેવા પોથીનું પાનું હજી મોકલ્યું નથી.",
      action: "કચેરી પાસેથી મોકલાવી દો, પછી આ આપોઆપ આગળ વધશે.",
    },
  },

  ERR_NOMINATION_MISSING: {
    en: {
      reason: "The form did not say who should receive the money after you.",
      action: "Add that name and send it again.",
    },
    hi: {
      reason: "फ़ॉर्म में यह नहीं लिखा था कि आपके बाद पैसा किसे मिलना चाहिए.",
      action: "वह नाम लिखकर दोबारा भेजिए.",
    },
    gu: {
      reason: "ફોર્મમાં એ લખ્યું નહોતું કે તમારા પછી પૈસા કોને મળવા જોઈએ.",
      action: "એ નામ લખીને ફરી મોકલો.",
    },
  },

  ERR_NOT_IN_PPO: {
    en: {
      reason:
        "Your name is not written in their pension paper, so the bank cannot start it on its own.",
      action: "Take the death certificate and Form 14 to the office they worked in.",
    },
    hi: {
      reason: "उनके पेंशन काग़ज़ पर आपका नाम नहीं लिखा, इसलिए बैंक अपने आप शुरू नहीं कर सकता.",
      action: "मृत्यु प्रमाणपत्र और फ़ॉर्म 14 लेकर उनके दफ़्तर जाइए.",
    },
    gu: {
      reason: "એમના પેન્શન કાગળ પર તમારું નામ નથી, એટલે બૅન્ક જાતે ચાલુ ન કરી શકે.",
      action: "મરણનું પ્રમાણપત્ર અને ફોર્મ 14 લઈને એમની કચેરીએ જાઓ.",
    },
  },

  ERR_BANK_MISMATCH: {
    en: {
      reason: "The name on the bank account is not the same as the name on the Aadhaar card.",
      action: "Ask the bank to correct the name, then send it again.",
    },
    hi: {
      reason: "बैंक खाते का नाम आधार कार्ड के नाम से नहीं मिल रहा.",
      action: "बैंक से नाम ठीक करवाकर दोबारा भेजिए.",
    },
    gu: {
      reason: "બૅન્ક ખાતાનું નામ આધાર કાર્ડના નામ સાથે મળતું નથી.",
      action: "બૅન્ક પાસે નામ સુધરાવીને ફરી મોકલો.",
    },
  },

  ERR_ACCOUNT_CLOSED: {
    en: {
      reason: "That bank account is closed or has not been used for a long time.",
      action: "Ask the bank to make it active, or give a different account.",
    },
    hi: {
      reason: "वह बैंक खाता बंद है या बहुत समय से चला नहीं है.",
      action: "बैंक से चालू करवाइए, या दूसरा खाता दे दीजिए.",
    },
    gu: {
      reason: "એ બૅન્ક ખાતું બંધ છે કે ઘણા સમયથી ચાલ્યું નથી.",
      action: "બૅન્ક પાસે ચાલુ કરાવો, કે બીજું ખાતું આપો.",
    },
  },

  ERR_ALREADY_APPLIED: {
    en: {
      reason: "This was asked for once already and is still being looked at.",
      action: "Nothing to do. Wait for the message about the first one.",
    },
    hi: {
      reason: "यह एक बार माँगा जा चुका है और अभी देखा जा रहा है.",
      action: "कुछ नहीं करना. पहले वाले का मैसेज आने का इंतज़ार कीजिए.",
    },
    gu: {
      reason: "આ એક વાર માગી લેવાયું છે અને હજી જોવાઈ રહ્યું છે.",
      action: "કશું કરવાનું નથી. પહેલાનો મેસેજ આવે એની રાહ જુઓ.",
    },
  },

  ERR_DOC_UNREADABLE: {
    en: {
      reason: "One of the papers was too blurred to read.",
      action: "Lay it flat in good light and photograph it again.",
    },
    hi: {
      reason: "एक काग़ज़ इतना धुँधला था कि पढ़ा नहीं गया.",
      action: "उसे सीधा रखकर, अच्छी रोशनी में दोबारा फ़ोटो लीजिए.",
    },
    gu: {
      reason: "એક કાગળ એટલો ધૂંધળો હતો કે વંચાયો નહીં.",
      action: "એને સીધું રાખીને, સારા અજવાળામાં ફરી ફોટો પાડો.",
    },
  },

  ERR_NEED_MORE_INFO: {
    en: {
      reason: "The officer needs one more detail before answering.",
      action: "Ring the help line with your reference number and they will tell you which one.",
    },
    hi: {
      reason: "जवाब देने से पहले अफ़सर को एक और बात चाहिए.",
      action: "अपना रेफ़रेंस नंबर लेकर हेल्पलाइन पर फ़ोन कीजिए, वे बता देंगे कौन सी.",
    },
    gu: {
      reason: "જવાબ આપતાં પહેલાં અધિકારીને એક વધુ વિગત જોઈએ છે.",
      action: "તમારો રેફરન્સ નંબર લઈને હેલ્પલાઇન પર ફોન કરો, એ કહી દેશે કઈ.",
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
