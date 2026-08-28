"use client";

import { useEffect, useId, useState } from "react";
import { Alert } from "./Icons";

interface Props {
  label: string;
  help?: string;
  error?: string | null;
  /** ISO `YYYY-MM-DD`, or empty while the date is still incomplete. */
  value: string;
  /** Twelve month names, already in the reader's language. */
  monthNames: string[];
  partLabels: { day: string; month: string; year: string };
  onChange: (iso: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Three boxes — day, month, year — instead of `<input type="date">`.
 *
 * The native control looked tidy and was the worst thing in the form. Its
 * written format follows the *browser's* locale rather than the page, so a
 * pensioner could be shown `mm/dd/yyyy` directly underneath helper text
 * reading "Day, month and year"; and its calendar opens on the current month,
 * so entering a birthdate in 1942 meant tapping back through a thousand of
 * them. Three boxes have one reading, work with the number pad, and let
 * someone type the year they have said out loud all their life.
 *
 * The month is a list rather than a number because "March" cannot be
 * mistaken for a day, and 03/04 can.
 */
export function DateField({
  label,
  help,
  error,
  value,
  monthNames,
  partLabels,
  onChange,
}: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const errId = `${id}-err`;

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  /* Seed the boxes when a whole date arrives from outside — a restored
     draft, or the demo prefill. A partial value never lands here, so typing
     the day before the month cannot wipe what was already typed. */
  useEffect(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return;
    setYear(m[1]);
    setMonth(String(Number(m[2])));
    setDay(String(Number(m[3])));
  }, [value]);

  /* Only a complete, real date is worth sending up; anything else is empty,
     so the ordinary "please fill this in" message does the work. */
  function emit(d: string, m: string, y: string) {
    const dn = Number(d);
    const mn = Number(m);
    if (y.length !== 4 || !d || !m || dn < 1 || dn > 31 || mn < 1 || mn > 12) {
      onChange("");
      return;
    }
    onChange(`${y}-${pad(mn)}-${pad(dn)}`);
  }

  const describedBy = [help ? helpId : null, error ? errId : null]
    .filter(Boolean)
    .join(" ");
  const invalid = error ? true : undefined;

  return (
    <fieldset className="field field-wide date-field">
      <legend className="field-label">{label}</legend>

      <div className="date-parts">
        <div className="date-part date-part-day">
          <label className="date-part-label" htmlFor={`${id}-d`}>
            {partLabels.day}
          </label>
          <input
            id={`${id}-d`}
            className="field-input tabular"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            placeholder="00"
            value={day}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 2);
              setDay(v);
              emit(v, month, year);
            }}
          />
        </div>

        <div className="date-part date-part-month">
          <label className="date-part-label" htmlFor={`${id}-m`}>
            {partLabels.month}
          </label>
          <select
            id={`${id}-m`}
            className="field-input"
            value={month}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            onChange={(e) => {
              setMonth(e.target.value);
              emit(day, e.target.value, year);
            }}
          >
            <option value=""> </option>
            {monthNames.map((name, i) => (
              <option key={name} value={String(i + 1)}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="date-part date-part-year">
          <label className="date-part-label" htmlFor={`${id}-y`}>
            {partLabels.year}
          </label>
          <input
            id={`${id}-y`}
            className="field-input tabular"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="0000"
            value={year}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setYear(v);
              emit(day, month, v);
            }}
          />
        </div>
      </div>

      {help && !error && (
        <p className="helper" id={helpId}>
          {help}
        </p>
      )}
      {error && (
        <p className="field-error" id={errId} role="alert">
          <Alert size={20} />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
