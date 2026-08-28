/**
 * Dictionary for the service catalogue — the whole pension lifecycle.
 *
 * Kept separate from en.ts so the original journey's strings stay readable,
 * and merged in lib/i18n/index.ts.
 *
 * Same copy rules (§9). One deliberate exception: "certificate" appears in
 * the names of physical papers a citizen must actually go and fetch — a
 * death certificate, a disability certificate. The ban exists so we never
 * say "your certificate was rejected"; it must not stop us naming the piece
 * of paper in the widow's folder by the name written on it.
 */
export const svcEn = {
  /* ================================================================
   * The hub — what do you need to do?
   * ================================================================ */
  hub: {
    title: "What do you need to do?",
    guide: "Pick the one that sounds like you.",

    catStart: "I want to start getting a pension",
    catStartSub: "I do not get one yet",
    catHave: "I already get a pension",
    catHaveSub: "Something needs doing",
    catFamily: "Someone in my family has died",
    catFamilySub: "They were getting a pension",

    notSure: "I am not sure which one",
    notSureSub: "Answer four questions and we will tell you",

    track: "Check something I already sent",
    trackSub: "You will need the reference number",
    trackLabel: "Reference number",
    trackHelp: "It looks like DLC-2026-ABCD1234. It is in the message we sent you.",
    trackGo: "Show me",
    trackEmpty: "Type the reference number first.",
  },

  /* ================================================================
   * The finder
   * ================================================================ */
  finder: {
    title: "Let us find the right one",
    guide: "A few questions. Nothing is sent anywhere.",

    qRoot: "What is happening?",
    oRootStart: "I want to start getting a pension",
    oRootStartSub: "I do not get one yet",
    oRootHave: "I already get a pension",
    oRootHaveSub: "Something needs doing",
    oRootDied: "Someone who got a pension has died",
    oRootDiedSub: "You may be able to take it over",

    qStartWork: "What kind of work did you do?",
    oWorkGovt: "A government job",
    oWorkGovtSub: "Central or state, and I am retiring soon or have just retired",
    oWorkPf: "A company that cut PF from my pay",
    oWorkPfSub: "Look for PF or EPF on an old pay slip",
    oWorkNone: "Neither of those",
    oWorkNoneSub: "Farm work, daily wages, housework, or no job",

    qAge: "How old are you?",
    oAge60: "60 or more",
    oAge40: "40 to 59",
    oAge18: "18 to 39",
    oAge18Sub: "You can start putting money aside for one now",

    qWhichTrue: "Is any of this true?",
    oTrueWidow: "My husband has died",
    oTrueDisability: "I have a disability paper for 80 percent or more",
    oTrueNone: "None of these",

    qHaveWhat: "What do you need?",
    oHaveLife: "Prove I am alive so the money keeps coming",
    oHaveLifeSub: "Once every year",
    oHaveMissing: "My pension has not come",
    oHaveMissingSub: "It stopped, or it is less than before",
    oHaveBank: "Move it to another bank",
    oHaveBankSub: "A new bank or a new branch",
    oHave80: "I have turned 80",
    oHave80Sub: "You are owed more than you are getting",

    noneMiddleAge:
      "There is no central pension for you yet. The old-age pension starts at 60, and the savings scheme closes at 40. Your state may still have something, and the help line can check for you.",
    noneTitle: "Nothing fits you yet",
    resultTitle: "This one looks right for you",
    askAgain: "Ask me again",
    seeService: "Tell me about it",
  },

  /* ================================================================
   * The services
   * ================================================================ */
  svc: {
    /* who decides, in words a citizen recognises */
    authVillage: "Your village or ward office, then the Collector",
    authEpfo: "The PF office",
    authOffice: "The office you worked in, then the pay office",
    authBank: "Your bank",
    authPda: "The office that pays your pension",
    authBankOrOffice: "Your bank, or the office they worked in",
    authGrievance: "The pension complaints cell",

    oldageName: "Old-age pension",
    oldageShort: "Monthly money for people aged 60 and over from a poor household",
    oldageWho: "You are 60 or more and your household is on the BPL list",
    oldageAmount: "Between 200 and 1,000 rupees a month, depending on your state and your age",
    oldageWhat:
      "Your village or ward office checks the papers, the village meeting reads out the list of names, and the Collector approves it. After that the money comes straight to your bank account every month. It goes up when you turn 80.",

    widowName: "Widow pension",
    widowShort: "Monthly money for a widow aged 40 and over from a poor household",
    widowWho: "Your husband has died, you are 40 or more, and your household is on the BPL list",
    widowAmount: "Between 300 and 1,250 rupees a month, depending on your state and your age",
    widowWhat:
      "The same route as the old-age pension: the village or ward office, then the village meeting, then the Collector. You will need the death certificate. It stops only if you marry again.",

    disabilityName: "Disability pension",
    disabilityShort: "Monthly money for a person with 80 percent disability from a poor household",
    disabilityWho: "You are 18 or more, your disability paper says 80 percent or more, and your household is on the BPL list",
    disabilityAmount: "Between 300 and 1,000 rupees a month, depending on your state and your age",
    disabilityWhat:
      "You need the disability certificate from a government hospital, or the UDID card. The village or ward office checks it and the Collector approves it.",

    epfpensionName: "Pension from your PF",
    epfpensionShort: "A monthly pension if a company cut PF from your pay for ten years or more",
    epfpensionWho: "You worked somewhere that cut PF, for ten years or more, and you are 58 or over",
    epfpensionAmount: "Worked out from your pay and your years of work. Usually 1,000 rupees a month or more",
    epfpensionWhat:
      "This is the pension the PF office pays. The hard part is not the form, it is that your old company has to confirm the day you left before the PF office will look at it. We will tell you if that is what is holding it up. You can take a smaller pension from 50 if you want it early.",

    govtretireName: "Government service pension",
    govtretireShort: "For someone retiring from a central or state government job",
    govtretireWho: "You worked in a government job for ten years or more and you are retiring within a year",
    govtretireAmount: "Half of your last pay, roughly, plus dearness relief",
    govtretireWhat:
      "This starts a year before you retire. Your own office checks your service book, the pay office works out the amount and makes the pension order, and it reaches your bank before your last working day. The order also lands in your DigiLocker.",

    apyName: "Put money aside now for a pension at 60",
    apyShort: "For anyone aged 18 to 40 with a bank or post office account",
    apyWho: "You are between 18 and 40, you have a savings account, and you do not pay income tax",
    apyAmount: "You choose: 1,000 to 5,000 rupees a month from the age of 60",
    apyWhat:
      "A small amount leaves your account every month until you turn 60. The younger you start, the smaller it is. If something happens to you, your husband or wife gets it, and after that your nominee gets the whole sum back.",

    familypensionName: "Take over a pension after a death",
    familypensionShort: "For the wife, husband, child or dependent parent of someone who was getting a pension",
    familypensionWho: "Someone who was getting a pension has died, and you were their wife, husband, child or dependent parent",
    familypensionAmount: "Thirty per cent of their last pay. Higher for the first ten years",
    familypensionWhat:
      "Most people do not know this: if your name is already written in their pension order, your bank can start paying you without any office visit at all. We will ask you about that first, because it can turn six weeks into one. If your name is not there, it goes to the office they worked in.",

    lifecertName: "Prove you are alive",
    lifecertShort: "The once-a-year check that keeps your pension coming",
    lifecertWho: "You already get a pension and it is time for the yearly check",
    lifecertAmount: "Free. It takes about three minutes",
    lifecertWhat:
      "Once a year the office that pays your pension has to see that you are still alive. It used to mean a trip to the bank. Now a photo from your phone does it. If you miss the window the pension stops, so this is the one not to leave late.",

    changebankName: "Move your pension to another bank",
    changebankShort: "A new bank, or a new branch of the same bank",
    changebankWho: "You get a pension and want it paid somewhere else",
    changebankAmount: "Free. About three weeks",
    changebankWhat:
      "Open the new account first. One thing catches everybody out: after the move you have to prove you are alive again at the new branch, even if you did it last month. We will remind you when the move is done.",

    age80Name: "Extra pension after 80",
    age80Short: "Your pension goes up by a fifth at 80, and keeps going up after that",
    age80Who: "You have turned 80 and your pension has not gone up",
    age80Amount: "Twenty per cent more at 80, thirty at 85, forty at 90, fifty at 95, double at 100",
    age80What:
      "This is supposed to happen on its own, from the first day of the month you turn 80 — not your birthday, the first of that month. Banks miss it all the time. If yours did, you are owed every rupee since then, and we will work out how much.",

    notarrivedName: "My pension has not come",
    notarrivedShort: "It stopped, came late, or came short",
    notarrivedWho: "You get a pension and something has gone wrong with the money",
    notarrivedAmount: "Free. An officer must answer within thirty days",
    notarrivedWhat:
      "This goes to the pension complaints cell with a docket number you can quote on the phone. Most of these turn out to be one of three things: the yearly proof-of-life was missed, the bank account was closed or dormant, or the branch never applied an increase.",

    /* the service page chrome */
    whoFor: "Who this is for",
    howMuch: "How much",
    whoDecides: "Who decides",
    howLong: "How long it takes",
    daysAbout: "About {n} days",
    dayOne: "Usually the same day",
    whatYouNeed: "What you will need",
    realSystem: "In real life this goes to",
    realFormIs: "The real form is",
    startThis: "Start this",
    notRight: "This is not the one I want",
    steps: "What happens after you send it",
  },

  /* ================================================================
   * Shared field labels
   * ================================================================ */
  /** Headings that break a long form into a few short ones. */
  groups: {
    you: "About you",
    youAssisted: "About them",
    home: "Where you live",
    homeAssisted: "Where they live",
    pension: "The pension",
    bank: "Where the money should go",
    newbank: "The new bank",
    household: "Your household",
    householdAssisted: "Their household",
    husband: "About your husband",
    husbandAssisted: "About her husband",
    disability: "About the disability",
    work: "Your work",
    workAssisted: "Their work",
    deceased: "About the person who died",
    apy: "What you want at 60",
    complaint: "What went wrong",
  },

  fields: {
    fullName: "Full name",
    fullNameHelp: "Exactly as it is written on the Aadhaar card.",
    dob: "Date of birth",
    dobHelp: "Day, month and year.",
    gender: "Are you a woman or a man?",
    genderF: "Woman",
    genderM: "Man",
    genderO: "Other",
    aadhaar: "Aadhaar number",
    aadhaarHelp: "We never store this. Use any 12 digits for this demo.",
    mobile: "Mobile number",
    mobileHelp: "We will send a 6-digit code to this number.",
    address: "Where you live",
    addressHelp: "Village or area, and the town.",
    district: "District",
    districtHelp: "",

    ppo: "PPO number",
    ppoHelp: "It is on the pension slip, 12 characters. Your bank can tell you it.",
    uan: "UAN number",
    uanHelp: "12 digits, on your PF slip. Leave it empty if you do not know it.",

    bankName: "Bank name",
    bankNameHelp: "",
    accountNumber: "Bank account number",
    accountNumberHelp: "The account has to be in your own name.",
    ifsc: "IFSC code",
    ifscHelp: "11 characters, printed on the first page of the passbook.",
    newBankName: "New bank name",
    newBankNameHelp: "",
    newAccountNumber: "New account number",
    newAccountNumberHelp: "This account must already be open.",
    newIfsc: "New IFSC code",
    newIfscHelp: "",

    rationCard: "Ration card number",
    rationCardHelp: "The BPL card.",
    annualIncome: "What your household earns in a year",
    annualIncomeHelp: "A rough figure is fine.",

    husbandName: "Your husband's name",
    husbandNameHelp: "",
    husbandDeathDate: "The day he died",
    husbandDeathDateHelp: "As written on the death certificate.",

    disabilityPercent: "What percentage the disability paper says",
    disabilityPercentHelp: "A number out of 100.",
    udid: "UDID number",
    udidHelp: "On the disability card, if you have one. You can leave it empty.",

    employerName: "The company you worked for",
    employerNameHelp: "",
    retireDate: "The day you stopped work",
    retireDateHelp: "Or the day you are going to retire.",
    officeName: "The office you worked in",
    officeNameHelp: "",
    employeeCode: "Employee number",
    employeeCodeHelp: "You can leave this empty.",
    serviceYears: "Years you worked there",
    serviceYearsHelp: "",

    deceasedName: "Their full name",
    deceasedNameHelp: "As written on the pension paper.",
    deceasedPpo: "Their PPO number",
    deceasedPpoHelp: "It is on any pension slip of theirs.",
    deathDate: "The day they died",
    deathDateHelp: "As written on the death certificate.",
    relationship: "How are you related to them?",
    relSpouse: "I was their wife or husband",
    relSon: "I am their son",
    relDaughter: "I am their daughter",
    relMother: "I am their mother",
    relFather: "I am their father",
    nameInPpo: "Is your name written in their pension paper?",
    nameInPpoHelp:
      "Look at their PPO. If your name is on it, your bank can start paying you without any office visit.",
    dontKnow: "I do not know",

    apyAmount: "How much do you want every month at 60?",
    apyAmountHelp: "The more you pick, the more leaves your account each month.",
    apy1000: "1,000 rupees a month",
    apy2000: "2,000 rupees a month",
    apy3000: "3,000 rupees a month",
    apy4000: "4,000 rupees a month",
    apy5000: "5,000 rupees a month",
    nomineeName: "Who should get it if something happens to you",
    nomineeNameHelp: "Usually your husband or wife.",

    complaintAbout: "What has gone wrong?",
    cmpNotCredited: "No money came at all",
    cmpLess: "Less money came than before",
    cmpStopped: "It used to come and then it stopped",
    cmpNoPpo: "I was approved but never got a pension number",
    cmpOther: "Something else",
    monthsMissing: "How many months of money are missing?",
    monthsMissingHelp: "",
    lastReceived: "The last time money came",
    lastReceivedHelp: "You can leave this empty if you cannot remember.",
    currentPension: "How much you get now, each month",
    currentPensionHelp: "",

    pickOne: "Pick one",
  },

  /* ================================================================
   * Shared documents
   * ================================================================ */
  docs: {
    aadhaarCard: "Aadhaar card",
    aadhaarCardHint: "Both sides.",
    bankPassbook: "Bank passbook",
    bankPassbookHint: "The first page, where the account number and IFSC are printed.",
    passportPhoto: "A photo of your face",
    passportPhotoHint: "We will take it with the camera in a moment.",
    ageProof: "Something that shows your age",
    ageProofHint: "Aadhaar, birth paper, school leaving paper or voter card.",
    bplCard: "BPL ration card",
    bplCardHint: "The card itself says BPL or APL on it.",
    residenceProof: "Something that shows where you live",
    residenceProofHint: "Electricity bill, ration card or voter card.",
    incomeCert: "Income paper from the Talati or Tehsildar",
    incomeCertHint: "Only some states ask for this.",
    deathCertificate: "Death certificate",
    deathCertificateHint: "The one the municipality or the panchayat gave you.",
    marriageProof: "Something that shows you were married",
    marriageProofHint: "A marriage paper, or a ration card with both names on it.",
    disabilityCert: "Disability certificate or UDID card",
    disabilityCertHint: "The one from a government hospital.",
    pensionSlip: "A recent pension slip",
    pensionSlipHint: "Any month from this year.",
    ppoCopy: "The PPO paper",
    ppoCopyHint: "If you cannot find it, your bank has a copy.",
    panCard: "PAN card",
    panCardHint: "You can add this later.",
    cancelledCheque: "A cheque with a line drawn through it",
    cancelledChequeHint: "Or the first page of the passbook instead.",
    jointPhoto: "A photo of the two of you together",
    jointPhotoHint: "You and your husband or wife. The pension office asks for this one.",
    serviceRecord: "A page from your service book",
    serviceRecordHint: "Your office keeps it. Ask them for a copy.",
    newPassbook: "Passbook of the new account",
    newPassbookHint: "The first page.",
  },

  /* ================================================================
   * Tracking stages
   * ================================================================ */
  stages: {
    received: "Received",
    villageCheck: "Checked at the village office",
    gramSabha: "Read out at the village meeting",
    blockCheck: "Checked at the taluka office",
    districtSanction: "Approved by the Collector",
    employerCheck: "Confirmed by the company",
    epfoCheck: "Checked at the PF office",
    officeCheck: "Checked by the office",
    paoCheck: "Worked out by the pay office",
    ppoIssued: "Pension order made",
    bankSetup: "Set up at your bank",
    firstPayment: "First money in your account",
    faceMatch: "Face checked",
    recordUpdated: "Record brought up to date",
    bankVerify: "Checked by the bank",
    bankUpdate: "Bank record changed",
    arrearsCalc: "Back money worked out",
    assigned: "Given to an officer",
    underReview: "Being looked into",
    answered: "Answered",

    actorCitizen: "You",
    actorVillage: "Village or ward office",
    actorBlock: "Taluka office",
    actorDistrict: "Collector's office",
    actorOffice: "Pension office",
    actorBank: "Your bank",
    actorSystem: "Automatic",

    waitingHere: "It is sitting here now",
    doneOn: "Done",
  },

  /* ================================================================
   * Eligibility questions and their honest answers
   * ================================================================ */
  elig: {
    title: "First, a few checks",
    guide: "So that you do not fill in a long form for nothing.",
    passTitle: "You can apply for this.",
    passGuide: "Nothing here is sent anywhere yet.",
    failTitle: "This one is not for you",
    failGuide: "Here is why, and what to do instead.",
    tryOther: "See the right one instead",
    carryOn: "Carry on anyway",
    carryOnNote:
      "You can still send it. Someone will look at it — it may just come back.",
    goHome: "Look at the other ones",

    qAge: "How old are you?",
    qAgeHelp: "In years.",
    qBpl: "Is your household on the BPL list?",
    qBplHelp: "Look at your ration card. It says BPL or APL on it.",
    qOtherPension: "Do you already get a pension from anywhere?",
    qWidowed: "Has your husband died?",
    qRemarried: "Have you married again since?",
    qCertified: "Do you have a disability certificate from a government hospital?",
    qSeverity: "Does it say 80 percent or more?",
    qPfCut: "Did your company cut PF from your pay?",
    qPfCutHelp: "Look for PF or EPF on an old pay slip.",
    qTenYears: "Did you work there for ten years or more?",
    qUanKnown: "Do you know your UAN number?",
    qUanKnownHelp: "It is fine either way. We can carry on without it.",
    qGovtJob: "Did you work in a central or state government job?",
    qRetiringSoon: "Are you retiring within the next year, or have you already retired?",
    qSavings: "Do you have a bank or post office savings account?",
    qTaxpayer: "Do you pay income tax?",
    qWasPensioner: "Was the person who died getting a pension?",
    qRelationship: "How are you related to them?",
    qHaveDeathCert: "Do you have the death certificate?",
    qHavePpo: "Do you have the PPO number?",
    qHavePpoHelp: "It is on any pension slip. Your bank can also tell you.",
    qNewAccountOpen: "Have you already opened the new account?",
    qAlreadyIncreased: "Has your pension already gone up since you turned 80?",

    eligAge60: "The old-age pension starts at 60.",
    eligAge40: "The widow pension starts at 40.",
    eligAge18: "This one starts at 18.",
    eligAge58Eps: "The PF pension starts at 58. You can take a smaller one from 50.",
    eligApyAge: "This one is for people aged 18 to 40.",
    eligAge80: "This is only for people who have turned 80.",
    eligBpl: "This one is only for households on the BPL list.",
    eligOtherPension: "You cannot take two of these at the same time.",
    eligWidow: "This one is only for women whose husband has died.",
    eligRemarried: "This one stops if you marry again.",
    eligDisabilityCert:
      "You need the paper from a government hospital first. The help line can tell you where to get it.",
    eligDisability80: "This one needs 80 percent or more.",
    eligNoPf: "Then this is not the right one for you.",
    eligTenYears: "The PF pension needs ten years of work.",
    eligUan: "That is fine either way.",
    eligNotGovt: "Then this is not the right one for you.",
    eligRetireWindow: "This one opens one year before you retire. Come back then.",
    eligTenYearsGovt: "A government pension needs ten years of counted service.",
    eligNoAccount: "Open a savings account at any bank or post office first. It costs nothing.",
    eligTaxpayer: "People who pay income tax cannot join this one.",
    eligNotPensioner: "Then there is no pension to take over.",
    eligRelationship: "Only a wife, husband, child or dependent parent can take it over.",
    eligDeathCert:
      "You need the death certificate first. The municipality or the panchayat gives it.",
    eligNoPpo: "You need the PPO number. It is on any pension slip, or ask your bank.",
    eligOpenAccount: "Open the new account first, then come back here.",
    eligAlreadyIncreased: "Then there is nothing left to claim.",
  },

  /* ================================================================
   * The engine's own chrome
   * ================================================================ */
  apply: {
    docsTitle: "What you need to have",
    docsGuide: "Take a photo of each one with the phone. You do not need a scanner.",
    docsTake: "Take a photo",
    docsRetake: "Take it again",
    docsDone: "Photographed",
    docsOptional: "Only if you have it",
    docsNeeded: "Needed",
    docsLater: "I will bring these later",
    docsCarryOn: "Carry on",
    docsCount: "{done} of {total} done",
    docsNone: "Nothing to bring for this one.",

    detailsTitle: "Your details",
    detailsGuide: "Take your time. Nothing is sent until you press send.",
    detailsAssisted: "Their details",

    reviewDocs: "Papers",
    reviewNoDocs: "No papers were added",
    photoOf: "Photo of {name}",

    nextStep: "Next",
    sendIt: "Send",
    errRequired: "This one is needed.",
    errDigits: "That is {n} digits. It needs {want}.",
    errDate: "Type the date as day, month, year.",
    errIfsc: "An IFSC code is 11 characters, like SBIN0001234.",
    errAge: "Type your age in years.",
    errPick: "Pick one of these.",
  },

  /* ================================================================
   * Outcomes — one shape per kind of service
   * ================================================================ */
  outcome: {
    sanctionTitle: "Your pension is approved.",
    sanctionSub: "The first money will reach your bank by {date}.",
    sanctionAmount: "Every month you will get",
    sanctionOrder: "Your pension order number",
    sanctionFirst: "First payment",
    sanctionKeep: "Keep this number. You will need it every year.",

    changeTitle: "Done.",
    changeSub: "From {date} your pension will come to the new bank.",
    changeEffective: "Changes from",
    changeLifecert:
      "One more thing: the new branch will ask you to prove you are alive once, even if you did it recently. We will send you a message when it is time.",

    increaseTitle: "Your pension has gone up.",
    increaseSub: "You will also get the back money you were owed.",
    increaseNow: "From now you will get",
    increaseArrears: "Back money owed to you",
    increaseFrom: "Owed since",

    grievanceTitle: "Your complaint is logged.",
    grievanceSub: "An officer has to answer you by {date}.",
    grievanceDocket: "Your complaint number",
    grievanceQuote: "Say this number if you ring the help line.",

    receiptFor: "For",
    savedAs: "Saved to the phone as a picture.",
  },
} as const;

export type SvcDict = {
  [Section in keyof typeof svcEn]: {
    [Key in keyof (typeof svcEn)[Section]]: string;
  };
};
