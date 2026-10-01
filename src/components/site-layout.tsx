import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowRightIcon, CloseIcon, GitBranchIcon, MenuIcon } from "./icons";
import { contextualHeaderAction } from "./workflow-context";
import { FeedbackControl } from "../features/feedback/feedback-control";
import { WorkflowNavigation } from "./workflow-navigation";

const navigation = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "What you get", href: "/#features" },
  { label: "Methodology", href: "/methodology" },
];

function Brand() {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 rounded-md" aria-label="DevPersonify home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-lime-300 shadow-soft">
        <GitBranchIcon className="h-5 w-5" />
      </span>
      <span className="text-[17px] font-bold tracking-[-0.025em] text-ink">DevPersonify</span>
    </Link>
  );
}

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const contextualAction = contextualHeaderAction(location.pathname);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <a href="#main-content" className="sr-only z-[100] rounded-md bg-white px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="relative z-50 border-b border-slate-200/80 bg-paper/95 backdrop-blur">
        <div className="container-page flex h-[72px] items-center justify-between">
          <Brand />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            {navigation.map((item) => (
              <a key={item.label} href={item.href} className="rounded-md text-sm font-medium text-slate-600 transition hover:text-ink">
                {item.label}
              </a>
            ))}
            <Link
              to={contextualAction.to}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {contextualAction.label}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </nav>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 bg-white text-ink md:hidden"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen ? (
          <nav id="mobile-navigation" className="absolute inset-x-0 top-[72px] border-b border-slate-200 bg-paper px-5 pb-6 pt-3 shadow-soft md:hidden" aria-label="Mobile navigation">
            <div className="mx-auto flex max-w-[1180px] flex-col gap-1">
              {navigation.map((item) => (
                <a key={item.label} href={item.href} className="rounded-xl px-3 py-3 text-base font-medium text-slate-700 hover:bg-white">
                  {item.label}
                </a>
              ))}
              <Link to={contextualAction.to} className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white">
                {contextualAction.label}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        ) : null}
      </header>
      <WorkflowNavigation />

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="container-page grid gap-8 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Brand />
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
              Clear, explainable career evidence for software engineers. No black-box scores and no destructive GitHub actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600 sm:justify-end">
            <Link className="rounded-md hover:text-ink" to="/privacy">Privacy</Link>
            <Link className="rounded-md hover:text-ink" to="/methodology">Methodology</Link>
            <Link className="rounded-md hover:text-ink" to="/restore">Backup & restore</Link>
            <a className="rounded-md hover:text-ink" href="https://github.com/santoshkatageri/devpersonify/issues/new" target="_blank" rel="noreferrer">Support via GitHub</a>
          </div>
          <p className="text-xs text-slate-600 sm:col-span-2 sm:text-right">© 2026 DevPersonify. Evidence before claims.</p>
        </div>
      </footer>
      <FeedbackControl />
    </div>
  );
}
