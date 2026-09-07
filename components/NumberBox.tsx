"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { destinationForNumber } from "@/lib/assistant/destinations";
import { HIGHEST, parseNumber } from "@/lib/numbers";

/**
 * Dial a number and go there.
 *
 * The reason this exists rather than only the badges: being told a number
 * is no use if the only way to spend it is to read fourteen names looking
 * for the one with a 9 beside it. Somebody rings the helpline, is told
 * "nine", and types nine. That is the whole interaction, and it needs no
 * reading at all.
 *
 * A wrong number is answered with the number they typed — "there is no
 * number 45" — and not with a general complaint about numbers. Somebody
 * who mishears 4 as 45 has to be able to see that that is what happened.
 */
export function NumberBox({
  onGo,
  className = "",
}: {
  /** The voice panel closes itself and stops talking before it navigates. */
  onGo?: (href: string) => void;
  className?: string;
}) {
  const { t, d } = useApp();
  const router = useRouter();
  const id = useId();

  const [value, setValue] = useState("");
  const [miss, setMiss] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const n = parseNumber(value);
    const dest = n === null ? null : destinationForNumber(n, d);

    if (n === null) return; // an empty box: nothing was asked, so nothing is said
    if (!dest) {
      setMiss(t("num.unknown", { n }));
      return;
    }

    setMiss("");
    setValue("");
    if (onGo) onGo(dest.href);
    else router.push(dest.href);
  }

  return (
    <form className={`num-box ${className}`.trim()} onSubmit={go}>
      <label className="num-box-l" htmlFor={id}>
        {t("num.label")}
      </label>
      <p className="num-box-hint">{t("num.hint", { last: HIGHEST })}</p>
      <div className="num-box-row">
        <input
          id={id}
          className="num-box-in"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMiss("");
          }}
          /* A number pad rather than a keyboard, on every phone that has
             one to offer. `pattern` is what iOS reads; `inputMode` is what
             everything else reads. */
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          autoComplete="off"
          enterKeyHint="go"
          placeholder={t("num.placeholder")}
          aria-describedby={miss ? `${id}-miss` : undefined}
        />
        <button type="submit" className="num-box-go" disabled={!value.trim()}>
          {t("num.go")}
        </button>
      </div>
      {miss && (
        <p className="num-box-miss" id={`${id}-miss`} role="alert">
          {miss}
        </p>
      )}
    </form>
  );
}
