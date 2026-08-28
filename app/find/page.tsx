"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton, BigLink } from "@/components/BigButton";
import { Chevron, Info, Phone, Refresh } from "@/components/Icons";
import { FINDER_ROOT, finderNode, type FinderTarget } from "@/lib/services/finder";

type View =
  | { kind: "node"; id: string }
  | { kind: "service"; id: string }
  | { kind: "none"; messageKey: string; suggest?: string };

/**
 * Four questions at most, in plain words, ending in one named service —
 * or in an honest "nothing fits you yet" with a phone number.
 *
 * You cannot search for the name of a thing you have never heard of, which
 * is why this is a decision tree and not a search box.
 */
export default function FinderScreen() {
  const { t, d } = useApp();
  const router = useRouter();

  const [view, setView] = useState<View>({ kind: "node", id: FINDER_ROOT });
  const [trail, setTrail] = useState<View[]>([]);

  function go(to: FinderTarget) {
    setTrail((cur) => [...cur, view]);
    setView(
      to.kind === "node"
        ? { kind: "node", id: to.id }
        : to.kind === "service"
          ? { kind: "service", id: to.id }
          : { kind: "none", messageKey: to.messageKey, suggest: to.suggest }
    );
  }

  function restart() {
    setTrail([]);
    setView({ kind: "node", id: FINDER_ROOT });
  }

  const F = d.finder as Record<string, string>;
  const SVC = d.svc as Record<string, string>;

  /* ---------------- a question ---------------- */
  if (view.kind === "node") {
    const node = finderNode(view.id);
    if (!node) return null;

    return (
      <ScreenShell
        step={null}
        back={trail.length ? undefined : "/start"}
        title={F[node.questionKey]}
        guide={t("finder.guide")}
        speakExtra={node.options.map((o) => F[o.labelKey]).join(". ")}
      >
        {trail.length > 0 && (
          <button
            type="button"
            className="review-edit"
            onClick={() => {
              const prev = trail[trail.length - 1];
              setTrail((c) => c.slice(0, -1));
              setView(prev);
            }}
            style={{ marginBottom: 20 }}
          >
            {t("common.back")}
          </button>
        )}

        <div role="group" aria-label={F[node.questionKey]}>
          {node.options.map((o) => (
            <button key={o.labelKey} type="button" className="card" onClick={() => go(o.to)}>
              <span className="card-title" style={{ justifyContent: "space-between" }}>
                <span>{F[o.labelKey]}</span>
                <Chevron size={22} />
              </span>
              {o.subKey && <span className="card-sub">{F[o.subKey]}</span>}
            </button>
          ))}
        </div>
      </ScreenShell>
    );
  }

  /* ---------------- an answer ---------------- */
  if (view.kind === "service") {
    const id = view.id;
    return (
      <ScreenShell
        step={null}
        title={t("finder.resultTitle")}
        guide={SVC[`${id}Short`]}
        speakExtra={`${SVC[`${id}Name`]}. ${SVC[`${id}Short`]}`}
        action={
          <>
            <BigLink href={`/service/${id}`} icon={<Chevron size={22} />}>
              {t("finder.seeService")}
            </BigLink>
            <BigButton variant="secondary" onClick={restart} icon={<Refresh size={22} />}>
              {t("finder.askAgain")}
            </BigButton>
          </>
        }
      >
        <div className="panel panel-good">
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 10px" }}>
            {SVC[`${id}Name`]}
          </h2>
          <p style={{ fontSize: 20, margin: "0 0 12px" }}>{SVC[`${id}Who`]}</p>
          <p className="helper" style={{ fontSize: 18 }}>
            {SVC[`${id}Amount`]}
          </p>
        </div>
      </ScreenShell>
    );
  }

  /* ---------------- an honest dead end ---------------- */
  const tel = t("common.helpNumber").replace(/\s/g, "");
  return (
    <ScreenShell
      step={null}
      title={t("finder.noneTitle")}
      guide={F[view.messageKey]}
      speakExtra={F[view.messageKey]}
      action={
        <>
          <BigLink href={`tel:${tel}`} icon={<Phone size={22} />}>
            {t("help.call")}
          </BigLink>
          {view.suggest && (
            <BigLink href={`/service/${view.suggest}`} variant="secondary">
              {SVC[`${view.suggest}Name`]}
            </BigLink>
          )}
          <BigButton variant="quiet" onClick={restart} icon={<Refresh size={22} />}>
            {t("finder.askAgain")}
          </BigButton>
        </>
      }
    >
      <div className="note note-info">
        <Info size={22} />
        <span>{F[view.messageKey]}</span>
      </div>
    </ScreenShell>
  );
}
