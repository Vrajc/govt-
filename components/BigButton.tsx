"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "quiet" | "attention";

interface Common {
  variant?: Variant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 64px tall, full width, 16px radius, 2px border. Never icon-only — the icon
 * slot is optional and the label is not.
 */
export function BigButton({
  variant = "primary",
  icon,
  children,
  className = "",
  ...rest
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function BigLink({
  variant = "primary",
  icon,
  children,
  href,
  className = "",
  ...rest
}: Common & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "children">) {
  return (
    <Link href={href} className={`btn btn-${variant} ${className}`} {...rest}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}
