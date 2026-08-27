"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import { ArrowLeft, Phone } from "./Icons";
import { ProgressBeads } from "./ProgressBeads";
import { SpeakButton } from "./SpeakButton";

interface Props {
  /** 1-6, or null on the pages outside the journey (/about, /help, /outbox). */
  step?: number | null;
  title: string;
  guide?: string;
  /** Where Back goes. Omit for screen 1, which has no Back. */
  back?: string;
  /** Extra words the Listen button should read after the title and guidance. */
  speakExtra?: string;
  /** Rendered in the sticky dock at the bottom. */
  action?: ReactNode;
  /** Hide the phone-number line — used only where the page IS the help page. */
  hideHelpline?: boolean;
  children: ReactNode;
}

export function ScreenShell({
  step = null,
  title,
  guide,
  back,
  speakExtra,
  action,
  hideHelpline = false,
  children,
}: Props) {
  const { t } = useApp();
  const router = useRouter();

  const spoken = [title, guide, speakExtra].filter(Boolean).join(". ");

  return (
    <>
      <div className="shell-top">
        {back ? (
          <button
            type="button"
            className="btn-header"
            onClick={() => {
              // Prefer real history so the browser's own Back and ours agree;
              // fall back to the declared route on a cold entry.
              if (window.history.length > 1) router.back();
              else router.push(back);
            }}
          >
            <ArrowLeft size={20} />
            <span>{t("common.back")}</span>
          </button>
        ) : (
          <span />
        )}
        <SpeakButton text={spoken} />
      </div>

      <main className="shell-main" id="main">
        {step !== null && <ProgressBeads step={step} />}

        <h1 className="screen-title">{title}</h1>
        {guide && <p className="screen-guide">{guide}</p>}

        {children}

        {action && <div className="action-dock">{action}</div>}

        {!hideHelpline && (
          <p className="helpline">
            {t("common.needHelp")}{" "}
            <a href={`tel:${t("common.helpNumber").replace(/\s/g, "")}`}>
              <Phone size={18} /> {t("common.helpNumber")}
            </a>
          </p>
        )}
      </main>

      <footer className="shell-foot">
        <p className="micro">
          <Link href="/about" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            {t("common.aboutLink")}
          </Link>
        </p>
        <p className="micro" style={{ marginTop: 8 }}>
          {t("common.protoBanner")}
        </p>
      </footer>
    </>
  );
}
