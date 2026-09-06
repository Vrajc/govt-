import {
  destinationMenu,
  resolveDestination,
  serviceDestination,
} from "@/lib/assistant/destinations";
import { fallbackAnswer, matchService, tFor } from "@/lib/assistant/fallback";
import { describePath } from "@/lib/assistant/where";
import { askVoice, hasGeminiKey } from "@/lib/gemini";
import { dictFor } from "@/lib/i18n";
import { fail, langOf, ok, readJson } from "@/lib/reqContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  /** What the phone heard, or what was typed instead. */
  text?: string;
  language?: string;
  /** The page they were standing on when they asked. */
  path?: string;
}

/**
 * The voice helper — one sentence in, one spoken answer and a path out.
 *
 * Like /api/explain, this route cannot fail from the caller's point of
 * view. An empty question is a 400; everything else comes back answered,
 * from the model when it replied in time and from the dictionary when it
 * did not. The client is never told to try again, because a person who has
 * just spoken out loud and been told "something went wrong" does not speak
 * a second time.
 *
 * Nothing about the person is sent to the model: no name, no number, no
 * draft. The sentence they said and the shape of the page they said it on,
 * and nothing else.
 */

/**
 * Same question, same page, same language — same answer, free.
 *
 * A demo asks "my pension has not come" a dozen times in ten minutes, and
 * a phone with a bad microphone sends the same sentence twice in a row.
 * Capped because this is module memory in a serverless function, not a
 * cache anybody is allowed to depend on.
 */
const CACHE_MAX = 200;
const cache = new Map<string, Answered>();

interface Answered {
  say: string;
  steps: string[];
  goto: { href: string; label: string } | null;
  source: "gemini" | "fallback";
}

function remember(key: string, value: Answered): Answered {
  if (cache.size >= CACHE_MAX) {
    // Oldest first. Map keeps insertion order, so this is one line.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const said = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  if (!said) {
    return fail("NOTHING_HEARD", "We did not catch that.", 400);
  }

  const lang = langOf(body?.language);
  const d = dictFor(lang);
  const t = tFor(d);
  /* A path, or the front page. Never trusted further than its shape: it is
     only ever read by describePath, which turns it into one English
     sentence out of a fixed list. */
  const path =
    typeof body?.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 120) : "/";

  const key = `${lang}|${path}|${said.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return ok({ ...hit, cached: true, keyPresent: hasGeminiKey() });

  const dEn = dictFor("en");
  const reply = await askVoice(said, lang, destinationMenu(dEn), describePath(path, dEn));

  if (reply) {
    /* The model gets to choose the destination, but not to leave somebody
       without one: if it said "none" and the words plainly name a service,
       the button appears anyway. A spoken answer with nowhere to press is
       half an answer. */
    const goto =
      resolveDestination(reply.goto, d) ??
      serviceDestination(matchService(said, d) ?? "", d);

    return ok({
      ...remember(key, { say: reply.say, steps: reply.steps, goto, source: "gemini" }),
      keyPresent: hasGeminiKey(),
    });
  }

  const answer = fallbackAnswer(said, d, t);
  return ok({
    ...remember(key, { ...answer, source: "fallback" }),
    keyPresent: hasGeminiKey(),
  });
}
