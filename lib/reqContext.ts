import { NextResponse } from "next/server";
import { LATENCY_MS } from "./mockPda";
import { apiErr, isErrorCode, type ApiErr, type ErrorCode, type Lang, type Record_ } from "./types";
import { isLang } from "./i18n/util";

/** Presenter settings, read off the request headers set by lib/api.ts. */
export interface DemoContext {
  forced: Record_["forced"];
  resolveInMs: number;
}

export function demoContext(req: Request): DemoContext {
  const outcome = req.headers.get("x-demo-outcome");
  const rawCode = req.headers.get("x-demo-code");
  const speed = req.headers.get("x-demo-speed");

  const code: ErrorCode | null = isErrorCode(rawCode) ? rawCode : null;

  const forced: Record_["forced"] =
    outcome === "ACCEPTED"
      ? { outcome: "ACCEPTED", code: null }
      : outcome === "NEEDS_FIX"
        ? // Null, not a default: a photo-quality code on a service with no
          // photo step is nonsense. decideOutcome falls back to the first
          // code the service actually declares.
          { outcome: "NEEDS_FIX", code }
        : null;

  const resolveInMs =
    speed === "instant"
      ? LATENCY_MS.instant
      : speed === "real"
        ? LATENCY_MS.real
        : LATENCY_MS.demo;

  return { forced, resolveInMs };
}

export function langOf(v: unknown, fallback: Lang = "en"): Lang {
  return isLang(v) ? v : fallback;
}

/** Every handler returns one of these two shapes — see types.ts. */
export function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json<ApiErr>(apiErr(code, message), { status });
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function digitsOnly(v: unknown): string {
  return typeof v === "string" ? v.replace(/\D/g, "") : "";
}
