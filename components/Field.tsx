"use client";

import { useId } from "react";
import { Alert } from "./Icons";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  help?: string;
  /** A sentence, never "Invalid input". Rendered under the field, in words. */
  error?: string | null;
}

/**
 * Label always visible above the input — never a placeholder standing in for
 * a label, because the label disappears exactly when an elderly user looks
 * away and back.
 */
export function Field({ label, help, error, className = "", ...input }: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const errId = `${id}-err`;

  const describedBy = [help ? helpId : null, error ? errId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`field-input ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
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
    </div>
  );
}
