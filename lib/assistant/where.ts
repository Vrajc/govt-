import type { Dict } from "@/lib/i18n";
import { isServiceId } from "@/lib/services/catalogue";

/**
 * What screen the person is standing on, said in one English sentence for
 * the model.
 *
 * Half of what anybody asks a voice assistant is "what do I press now",
 * and that question has no answer without knowing where "now" is. The
 * path is the cheapest possible way to know: it is already in the browser,
 * it carries the service and the step, and it says nothing private.
 */

const STEP: Record<string, string> = {
  who: "saying whether they are doing this for themselves or for somebody else",
  eligibility: "answering the few short questions that decide whether this service is for them",
  documents: "photographing the papers this service asks for, with the phone",
  details: "filling in the form",
  photo: "taking the photograph of their own face",
  review: "checking everything once before it goes",
};

export function describePath(path: string, dEn: Dict): string {
  const svc = dEn.svc as Record<string, string>;
  const name = (id: string) => svc[`${id}Name`] ?? id;
  const parts = path.split("/").filter(Boolean);
  const [head, a, b] = parts;

  if (!head) return "the front page, which explains what this site is for";

  switch (head) {
    case "start":
      return a
        ? "a list of the services in one of the three groups"
        : "the list of every service, grouped into three doors";
    case "find":
      return "the four short questions that find the right service";
    case "service":
      return isServiceId(a)
        ? `the page for ${name(a)}: who it is for, what it pays, and which papers it needs`
        : "a service page";
    case "apply":
      return isServiceId(a) && b && STEP[b]
        ? `the ${name(a)} application. They are ${STEP[b]}`
        : "an application in progress";
    case "result":
      return "the answer that came back after they sent an application";
    case "status":
      return "the timeline showing which office is holding their file now";
    case "track":
      return "the page that looks up something already sent, by reference number";
    case "help":
      return "the help page: the helpline, the nearest place with a person, what to carry";
    case "about":
      return "the page explaining what is real here and what is pretend";
    case "outbox":
      return "the list of messages this site has sent them";
    default:
      return "a page in this site";
  }
}
