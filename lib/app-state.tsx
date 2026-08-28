"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Application, ErrorCode, Lang, Mode } from "./types";
import { fill, isLang, SPEECH_TAGS } from "./i18n/util";
import type { Dict } from "./i18n";
import { APP_KEY, DEMO_KEY, LANG_COOKIE } from "./constants";

/* ------------------------------------------------------------------ *
 * Storage keys
 * ------------------------------------------------------------------ */
// Defined in lib/constants.ts, not here: a server component that imports a
// value from a "use client" module gets a client reference, not the value.
export { LANG_COOKIE };

/* ------------------------------------------------------------------ *
 * Demo settings
 * ------------------------------------------------------------------ */
export type DemoOutcome = "auto" | "ACCEPTED" | "NEEDS_FIX";
export type DemoSpeed = "instant" | "demo" | "real";

export interface DemoSettings {
  outcome: DemoOutcome;
  code: ErrorCode;
  speed: DemoSpeed;
  slow3g: boolean;
}

export const DEFAULT_DEMO: DemoSettings = {
  outcome: "auto",
  code: "ERR_FACE_QUALITY_LOW",
  speed: "demo",
  slow3g: false,
};

/* ------------------------------------------------------------------ *
 * Application draft
 * ------------------------------------------------------------------ */
function newRequestId(): string {
  // Idempotency key. crypto.randomUUID is available in every browser that
  // can run getUserMedia; the fallback is only for very old WebViews.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyApplication(lang: Lang): Application {
  return {
    requestId: newRequestId(),
    lang,
    mode: "self",
    serviceId: null,
    // The form is a bag of values keyed by field id, because the fields
    // themselves come from whichever service is being filled in.
    eligibility: {},
    values: {},
    docs: {},
    helperName: "",
    otpVerified: false,
    photo: null,
    photoQuality: null,
    fixingId: null,
  };
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */
interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Screen 1 only: set the language and reload into it. */
  chooseLang: (l: Lang, to: string) => void;
  d: Dict;
  /** `t("who.title")`, with optional `{name}` interpolation. */
  t: (path: string, vars?: Record<string, string | number>) => string;
  speechTag: string;

  app: Application;
  patch: (p: Partial<Application>) => void;
  resetApp: () => void;
  /** True once sessionStorage has been read — screens wait for this. */
  ready: boolean;

  demo: DemoSettings;
  setDemo: (p: Partial<DemoSettings>) => void;
  demoMode: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  initialLang,
  dict,
  children,
}: {
  initialLang: Lang;
  /**
   * Resolved on the server from the language cookie. Passing it down rather
   * than importing all three keeps two scripts the reader cannot use out of
   * their bundle entirely.
   */
  dict: Dict;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [app, setApp] = useState<Application>(() => emptyApplication(initialLang));
  const [demo, setDemoState] = useState<DemoSettings>(DEFAULT_DEMO);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  /* ---- hydrate from storage once ---- */
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = sessionStorage.getItem(APP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Application>;
        setApp((cur) => ({ ...cur, ...parsed }));
        if (isLang(parsed.lang)) setLangState(parsed.lang);
      }
    } catch {
      /* corrupt storage is not worth crashing over — start fresh */
    }
    try {
      const rawDemo = localStorage.getItem(DEMO_KEY);
      if (rawDemo) setDemoState({ ...DEFAULT_DEMO, ...JSON.parse(rawDemo) });
    } catch {
      /* same */
    }
    setReady(true);
  }, []);

  /* ---- persist the draft ---- */
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(APP_KEY, JSON.stringify(app));
    } catch {
      // Quota: the photo data URL is the only large field. Drop it rather
      // than lose the whole draft — the user can retake it.
      try {
        sessionStorage.setItem(APP_KEY, JSON.stringify({ ...app, photo: null }));
      } catch {
        /* give up quietly; the journey still works in memory */
      }
    }
  }, [app, ready]);

  /* ---- keep <html lang> and the font class in sync ---- */
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.classList.remove("lang-en", "lang-hi", "lang-gu");
    el.classList.add(`lang-${lang}`);
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setApp((cur) => ({ ...cur, lang: l }));
  }, []);

  /**
   * Choosing a language on screen 1. The cookie has to be written before the
   * navigation, and the navigation has to reach the server, so this is a
   * full page load rather than a client route change. One reload, on the
   * very first screen, in exchange for never shipping an unread script.
   */
  const chooseLang = useCallback((l: Lang, to: string) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setLangState(l);
    setApp((cur) => ({ ...cur, lang: l }));
    window.location.assign(to);
  }, []);

  const patch = useCallback((p: Partial<Application>) => {
    setApp((cur) => ({ ...cur, ...p }));
  }, []);

  const resetApp = useCallback(() => {
    setApp(emptyApplication(lang));
    try {
      sessionStorage.removeItem(APP_KEY);
    } catch {
      /* nothing to clean up */
    }
  }, [lang]);

  const setDemo = useCallback((p: Partial<DemoSettings>) => {
    setDemoState((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(next));
      } catch {
        /* presenter settings are a convenience, not data */
      }
      return next;
    });
  }, []);

  // One language per page load. Switching does a full navigation so the
  // server can send the right dictionary, fonts and <html lang> together.
  const d = dict;

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const [section, key] = path.split(".");
      const table = (d as unknown as Record<string, Record<string, string>>)[section];
      const raw = table?.[key];
      // A missing key should be loud in development and harmless in production.
      if (raw === undefined) return path;
      return fill(raw, vars);
    },
    [d]
  );

  const value: AppContextValue = {
    lang,
    setLang,
    chooseLang,
    d,
    t,
    speechTag: SPEECH_TAGS[lang],
    app,
    patch,
    resetApp,
    ready,
    demo,
    setDemo,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/** Read the demo settings outside React (used by the fetch wrapper). */
export function readDemoSettings(): DemoSettings {
  if (typeof window === "undefined") return DEFAULT_DEMO;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? { ...DEFAULT_DEMO, ...JSON.parse(raw) } : DEFAULT_DEMO;
  } catch {
    return DEFAULT_DEMO;
  }
}
