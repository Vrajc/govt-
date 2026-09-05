"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import { ArrowLeft } from "./Icons";
import { ProgressBeads } from "./ProgressBeads";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { SpeakButton } from "./SpeakButton";

interface Props {
  /** 1-based position, or null on pages outside a journey (/about, /help). */
  step?: number | null;
  /** How many steps this particular service has. */
  totalSteps?: number;
  title: string;
  guide?: string;
  /**
   * Where Back goes. Always give it a real destination — history alone is
   * unreliable when someone lands from a message link, and a Back button
   * that sometimes leaves the site is worse than none.
   */
  back?: string;
  /** The trail above the title. The last crumb is the current screen. */
  crumbs?: Crumb[];
  /** Screen-reader name for each progress bead. */
  stepLabelFor?: (n: number) => string;
  /** Jump back to a completed step. */
  onGoToStep?: (n: number) => void;
  /** Extra words the Listen button should read after the title and guidance. */
  speakExtra?: string;
  /** Rendered in the sticky dock at the bottom. */
  action?: ReactNode;
  /**
   * Let the sheet grow past the reading measure on a desktop. For screens
   * whose content is a grid or a table rather than prose — never for a
   * screen that asks one question, which stays narrow at any size.
   */
  wide?: boolean;
  children: ReactNode;
}

/* The helpline used to be printed again at the foot of every screen. It is
   in the masthead of every page and in the site footer of every page, so
   that was a third copy of the same eleven digits — and the screen that
   most needed the room, the capture screen on a small phone, was the one
   paying for it. /help still prints it, because that page is the offer. */
export function ScreenShell({
  step = null,
  totalSteps,
  title,
  guide,
  back,
  crumbs,
  stepLabelFor,
  onGoToStep,
  speakExtra,
  action,
  wide = false,
  children,
}: Props) {
  const { t, d } = useApp();
  const router = useRouter();

  const spoken = [title, guide, speakExtra].filter(Boolean).join(". ");

  return (
    <div className={`sheet ${wide ? "sheet-wide" : ""}`}>
      <div className="shell-top">
        <div className="shell-top-left">
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
        </div>
        <SpeakButton text={spoken} />
      </div>

      <main className="shell-main" id="main">
        {crumbs && crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
        {step !== null && (
          <ProgressBeads
            step={step}
            total={totalSteps}
            labelFor={stepLabelFor}
            onGo={onGoToStep}
          />
        )}

        <h1 className="screen-title">{title}</h1>
        {guide && <p className="screen-guide">{guide}</p>}

        {children}

        {action && <div className="action-dock">{action}</div>}

      </main>

      {/* The disclosure lives in the banner at the top of every screen and
          nowhere else in the journey. Repeating it in the footer of all
          eighteen screens made it wallpaper, which is the one thing a
          disclosure must never become. */}
      <footer className="shell-foot">
        <p className="micro">
          <Link href="/about" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            {t("common.aboutLink")}
          </Link>
        </p>
      </footer>
    </div>
  );
}
