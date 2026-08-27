"use client";

import { readDemoSettings } from "./app-state";
import type { ApiErr } from "./types";

/** Roughly one Slow 3G round trip, added on top of the real request. */
const SLOW_3G_MS = 1_600;

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiErr };

/**
 * One place where every network call goes, so that:
 *   • demo settings ride along as headers instead of polluting every payload
 *   • the slow-network simulation is real latency, not a fake spinner
 *   • a dropped connection becomes a typed error, never an unhandled throw
 *   • nothing can hang the UI forever
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Result<T>> {
  const demo = readDemoSettings();
  if (demo.slow3g) await sleep(SLOW_3G_MS);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 20_000);

  try {
    const res = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-demo-outcome": demo.outcome,
        "x-demo-code": demo.code,
        "x-demo-speed": demo.speed,
        ...(init?.headers ?? {}),
      },
    });

    const body = (await res.json().catch(() => null)) as unknown;

    if (!res.ok || !body || (body as { ok?: boolean }).ok === false) {
      const err = body as Partial<ApiErr> | null;
      return {
        ok: false,
        error: {
          ok: false,
          code: err?.code ?? `HTTP_${res.status}`,
          message: err?.message ?? "Something did not work. Nothing was lost.",
        },
      };
    }

    return { ok: true, data: body as T };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      error: {
        ok: false,
        code: aborted ? "TIMEOUT" : "NETWORK",
        message: "Could not reach us — check your connection.",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
