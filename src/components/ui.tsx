import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "./icons";

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export function ButtonLink({ to, children, variant = "primary", className = "" }: ButtonLinkProps) {
  const variants = {
    primary: "bg-cobalt-600 text-white shadow-lift hover:bg-cobalt-700",
    secondary: "border border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-slate-50",
  };

  return (
    <Link
      to={to}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition duration-200 ${variants[variant]} ${className}`}
    >
      {children}
      <ArrowRightIcon className="h-4 w-4" />
    </Link>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function PrimaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-cobalt-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";
  return (
    <div className={`max-w-2xl ${alignment}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
        {title}
      </h2>
      {description ? <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{description}</p> : null}
    </div>
  );
}
