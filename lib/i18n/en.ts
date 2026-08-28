/**
 * English source of truth. Every other language file must have exactly these
 * keys — the `Dict` type is derived from this object, so a missing key in
 * hi.ts or gu.ts is a compile error.
 *
 * Copy rules (MASTER_PROMPT §9) apply to every string in here:
 * no "biometric", "authentication", "verification", "submit", "invalid",
 * "error", "failed", "rejected", "certificate", "portal", "DLC", "PDA", "KYC".
 * Sentence case. No exclamation marks. No emoji in body copy.
 */
export const en = {
  meta: {
    htmlLang: "en",
    speech: "en-IN",
    name: "English",
  },

  common: {
    appName: "Pension Saral",
    tagline: "Prove you are here. Keep your pension.",
    protoBanner: "A student prototype. Not an official government service.",
    back: "Back",
    listen: "Listen",
    stop: "Stop",
    continue: "Continue",
    edit: "Change",
    tryAgain: "Try again",
    needHelp: "Need help? Call",
    helpNumber: "1800 180 1947",
    aboutLink: "What is real here, and what is pretend",
    stepOf: "Step {n} of {total}",
    loading: "One moment",
    yes: "Yes",
    no: "No",
    startOver: "Start again from the beginning",
  },

  lang: {
    title: "Choose your language",
    taglineEn: "Prove you are here. Keep your pension.",
    taglineHi: "अपनी पहचान दीजिए, पेंशन चलती रहे.",
    taglineGu: "તમારી ઓળખ આપો, પેન્શન ચાલુ રહે.",
  },

  who: {
    title: "Who is this for?",
    guide: "Pick one. You can change it later.",
    self: "This is for me",
    selfSub: "I am the pensioner",
    assisted: "I am helping a family member",
    assistedSub: "I will fill this in for them",
    note: "Many people do this for a parent. That is fine — you do not have to pretend to be them.",
  },

  details: {
    title: "Your pension details",
    titleAssisted: "Their pension details",
    guide: "Three things, then a code on the phone.",
    guideAssisted: "Three things about them, then a code on their phone.",

    ppoLabel: "PPO number",
    ppoHelp: "It is on the pension slip, 12 characters.",
    ppoPlaceholder: "PPO-2024-000123",

    aadhaarLabel: "Aadhaar number",
    aadhaarHelp: "We never store this. Use any 12 digits for this demo.",

    mobileLabel: "Mobile number",
    mobileHelp: "We will send a 6-digit code.",
    mobileHelpAssisted: "We will send a 6-digit code to this phone.",

    nameLabel: "Full name",
    nameHelp: "Exactly as it is written on the pension slip.",

    sendCode: "Send code",
    sending: "Sending the code",
    otpLabel: "The 6-digit code",
    otpHelp: "Sent to {mobile}.",
    otpDemo: "For this demo the code is {code}.",
    otpCheck: "Check the code",
    otpChecking: "Checking",
    otpMatched: "The code matched.",
    otpResend: "Send it again",
    foundName: "Pension record found for {name}.",
    notFound: "We could not find that PPO number. Type the name below and carry on.",

    errPpo: "Please type the PPO number from the pension slip.",
    errAadhaar: "That is {n} digits. Aadhaar has 12.",
    errAadhaarEmpty: "Please type the 12-digit Aadhaar number.",
    errMobile: "That is {n} digits. A mobile number has 10.",
    errMobileEmpty: "Please type the 10-digit mobile number.",
    errOtp: "That is {n} digits. The code has 6.",
    errOtpWrong: "That code does not match. Look at the message again.",
    errName: "Please type the name as it is on the pension slip.",
  },

  photo: {
    title: "Take your photo",
    titleAssisted: "Take their photo",
    guide: "Three quick things first.",
    check1: "Stand facing a window or a light",
    check2: "Take off glasses, cap and mask",
    check3: "Hold the phone at eye level",
    check1Assisted: "Ask them to face a window or a light",
    check2Assisted: "Ask them to take off glasses, cap and mask",
    check3Assisted: "Hold the phone at their eye level",
    ready: "I am ready — open the camera",
    uploadInstead: "Choose a photo from the phone instead",
    uploading: "Opening the gallery",

    capture: "Take the photo",
    switchCam: "Turn the camera around",
    use: "Use this photo",
    retake: "Take it again",
    lookAt: "Look at the camera",
    lookAtAssisted: "Ask them to look at the camera",

    coachStarting: "Starting the camera",
    coachDark: "A bit too dark — face a window",
    coachBright: "Too much light — turn away from the window",
    coachBlurry: "Hold the phone still",
    coachNoFace: "Move a little closer",
    coachGood: "Looks good — take the photo",

    deniedTitle: "We could not open the camera",
    deniedBody:
      "The phone did not allow it. You can pick a photo from the gallery instead — it works just the same.",
    fixBanner: "Just the photo this time. Everything else is saved.",
    photoAlt: "The photo you just took",
  },

  review: {
    title: "Check and send",
    guide: "This is everything we will send. Nothing else.",
    rowPhoto: "Photo",
    rowName: "Name",
    rowPpo: "PPO number",
    rowAadhaar: "Aadhaar number",
    rowMobile: "Mobile number",
    rowHelper: "Filled in by",
    helperLabel: "Your name",
    helperHelp: "So the pension office knows who helped.",
    checking: "Looking at the photo",
    good: "This looks good to send.",
    send: "Send",
    sendAnyway: "Send anyway",
    sendingNow: "Sending",
    netTitle: "Could not send — check your connection.",
    netBody: "Nothing was lost. Press try again and it will pick up where it stopped.",
    missingTitle: "Some details are missing",
    missingBody: "Go back and fill in the rest, then come here again.",
    goBack: "Go back and fill it in",
  },

  status: {
    title: "We are checking this",
    lead: "We have received it. We are checking now.",
    tlReceived: "Received",
    tlChecking: "Checking",
    tlResult: "Result",
    tlWaiting: "Waiting for the pension office",
    tlDoneGood: "All done",
    tlDoneFix: "One thing to fix",
    wait: "This usually takes about 2 minutes. You can close this page — we will send a message to {mobile}.",
    waitDemo: "For this demo it takes about 8 seconds.",
    closeOk: "You can close this page. We will send a message to {mobile}.",
    refLabel: "Your reference number",
    refHelp: "Keep this. It opens this page again.",
    announceChecking: "Still checking.",
    announceDone: "The result is ready.",
    notFound: "We could not find that reference number.",
    notFoundBody: "It may have been cleared when the page was reloaded. You can start again.",
  },

  accepted: {
    title: "Your pension is safe.",
    sub: "The pension office has your proof. Nothing more to do until November {year}.",
    receiptHead: "Proof of life — received",
    receiptName: "Name",
    receiptPpo: "PPO number",
    receiptRef: "Reference",
    receiptOn: "Received on",
    safeUntil: "Your pension is safe until",
    stampTop: "RECEIVED",
    stampBottom: "PENSION SARAL",
    stampMiddle: "PROOF OF LIFE",
    save: "Save this",
    saving: "Saving",
    saved: "Saved to the phone as a picture.",
    savePrint: "Print or save as PDF",
    remind: "Remind me next year",
    reminded: "We will send a message on {date}, a month before it is due.",
  },

  needsFix: {
    title: "One small thing to fix.",
    fixSend: "Fix and send again",
    talk: "Talk to someone",
    tech: "Technical details",
    techIntro: "Shown for honesty. A pensioner would never see this.",
    techCode: "Code from the pension office",
    techRef: "Reference",
    techAttempt: "Attempt",
    techExplain: "Explanation written by",
    techAi: "an OpenAI model, live",
    techFallback: "the built-in word list (no live call)",
  },

  help: {
    title: "Get help",
    guide: "Three ways. Pick whichever is easiest.",
    call: "Call us",
    callSub: "Free, 8 in the morning to 8 at night",
    centres: "Find the nearest help centre",
    centresSub: "Someone there will do this with you",
    steps: "Read the steps again",
    stepsSub: "The five things, in order",
    centresTitle: "Help centres near you",
    centresNote: "A short mock list for this demo. A real one would use your location.",
    stepsTitle: "The steps, in order",
    step1: "Choose your language.",
    step2: "Say whether it is for you or for a family member.",
    step3: "Type the PPO number, the Aadhaar number and the mobile number, then the code we send.",
    step4: "Take a photo in good light, facing a window.",
    step5: "Check everything and press send. Wait for the message.",
    open: "Open",
    km: "km away",
  },

  about: {
    title: "What is real and what is pretend",
    guide: "This is a student prototype. Here is exactly where the line is.",
    realHead: "Real in this prototype",
    mockHead: "Pretend",
    real1: "The whole journey, start to finish",
    real2: "Taking the photo and checking its quality",
    real3: "The plain-language explanation when something needs fixing (live OpenAI call)",
    real4: "The check on your photo before it is sent (live OpenAI call)",
    real5: "Spoken guidance in all three languages",
    real6: "The status state machine and its audit log",
    mock1: "Aadhaar number, the code on the phone, the PPO lookup",
    mock2: "Matching your face against the government database",
    mock3: "The pension office system that gives the result",
    mock4: "The message to your phone (written to a visible outbox instead)",
    mock5: "Bank and post-office links",
    outboxLink: "See the messages we would have sent",

    scaleTitle: "How this would work at real scale",
    scale1Head: "Where it plugs in.",
    scale1:
      "This is a front end. In production it would call the existing Jeevan Pramaan and UIDAI face-match services through an authorised pension-agency integration — the government stays the system of record. Nothing here duplicates a government database.",
    scale2Head: "What we would never store.",
    scale2:
      "Aadhaar numbers, fingerprint and face data, and photos are all transient. The photo goes to the matching service and is discarded; only the resulting reference number and status persist.",
    scale3Head: "The AI is advisory only.",
    scale3:
      "It never decides an outcome. It only explains an outcome the government system already returned, and warns about a photo before it is sent. A wrong AI guess costs one retake, never a pension.",
    scale4Head: "Falling back to humans.",
    scale4:
      "Every dead end routes to a phone number and a list of nearby help centres. Digital-first must not mean digital-only.",
    scale5Head: "Scale.",
    scale5:
      "Roughly one crore submissions a year, heavily concentrated in November and December. That is a queue problem, not a compute problem — the async job model used here is the shape of the answer. Staggering reminders by PPO series would flatten the peak.",
    scale6Head: "Accessibility as infrastructure.",
    scale6:
      "Three languages here; 22 scheduled languages is a content-pipeline problem, not a rebuild. Every string already goes through one dictionary.",

    techTitle: "For the technically curious",
    techBody:
      "Next.js 15 App Router, TypeScript, Tailwind v4. The mock pension office is a state machine with an audit log, behind real HTTP route handlers, backed by an in-memory Map — in production a Postgres table and a job queue. The OpenAI model gpt-4o-mini is called only from the server, only for the two jobs above, and every call has a hardcoded fallback so the app works with the key removed.",
    notAffiliated:
      "Pension Saral is not affiliated with, endorsed by, or connected to the Government of India, MeitY, UIDAI or Jeevan Pramaan. No government emblem, logo or flag is used anywhere in this prototype.",
  },

  outbox: {
    title: "Messages we would have sent",
    guide: "Nothing actually leaves this page. This is what the SMS would say.",
    empty: "Nothing yet. Send something through the journey and it will appear here.",
    to: "To",
    none: "No messages",
  },

  demo: {
    title: "Presenter controls",
    guide: "Not part of the journey. Press Ctrl + Shift + D from any screen.",
    outcome: "Force the next result",
    outcomeAuto: "Decide honestly",
    outcomeAccept: "Always accept",
    outcomeFix: "Always needs fixing",
    codePick: "Which code",
    speed: "Speed",
    speedInstant: "Instant",
    speedDemo: "8 seconds",
    speedReal: "2 minutes",
    slow3g: "Pretend the network is slow",
    slow3gSub: "Adds about 1.6 seconds to every request",
    prefill: "Fill the form with the demo pensioner",
    prefillDone: "Filled in. Ramanbhai Patel, PPO-2024-000123.",
    reset: "Clear everything and start again",
    resetDone: "Cleared.",
    apply: "Save these settings",
    applied: "Saved.",
    closeDemo: "Back to the journey",
    aiStatus: "OpenAI key on the server",
    aiOn: "Present — live calls will be made",
    aiOff: "Not set — built-in fallbacks will be used",
  },

  /** Outbound messages. Every one carries the prototype disclosure. */
  sms: {
    received:
      "We have your proof of life. Reference {id}. We will send the result shortly. - Pension Saral",
    accepted:
      "Your pension is safe until {date}. Nothing more to do. Reference {id}. - Pension Saral",
    needsFix:
      "One small thing to fix with your proof of life. Open the page again to fix it. Reference {id}. - Pension Saral",
    reminder:
      "It is time to prove you are here so your pension keeps coming. It takes about three minutes. Reference {id}. - Pension Saral",
  },

  errors: {
    generic: "Something did not work. Nothing was lost.",
    network: "Could not reach us — check your connection.",
    notFound: "We could not find that.",
    badRequest: "Some details were missing.",
    tooMany: "That was sent already. We are using the first one.",
  },
} as const;

/**
 * Widened so hi.ts / gu.ts can supply their own strings, but with the exact
 * same key set — a missing or misspelled key is a compile error.
 */
export type Dict = {
  [Section in keyof typeof en]: {
    [Key in keyof (typeof en)[Section]]: string;
  };
};

export type Section = keyof Dict;
