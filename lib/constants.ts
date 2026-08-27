/**
 * Plain constants shared by server and client code.
 *
 * These deliberately do NOT live in lib/app-state.tsx: that file is marked
 * "use client", and every export of a client module becomes a client
 * reference proxy when a server component imports it — so a string constant
 * imported from there silently arrives as an object on the server. That cost
 * us the whole server-side language detection once already.
 */

/** Mirrors the chosen language into a cookie so the server can render it. */
export const LANG_COOKIE = "ps_lang";

/** sessionStorage: the in-progress application. Dies with the tab. */
export const APP_KEY = "ps_app";

/** localStorage: presenter settings, not user data. */
export const DEMO_KEY = "ps_demo";
