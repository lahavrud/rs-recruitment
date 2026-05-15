import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { ToastProvider } from "@/contexts/ToastContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Logo from "@/components/ui/Logo";
import Toaster from "@/components/ui/Toaster";

interface Props {
  children: ReactNode;
}

/* ── Public footer ───────────────────────────────────────────────────────── */
export function PublicFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-white/8 bg-void">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-8 sm:flex-row sm:justify-between">
        <Link to="/" className="shrink-0">
          <Logo size={24} />
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/30">
          <Link to="/jobs"    className="transition hover:text-white/60">{t("nav.jobs")}</Link>
          <Link to="/about"   className="transition hover:text-white/60">{t("nav.about")}</Link>
          <Link to="/contact" className="transition hover:text-white/60">{t("nav.contact")}</Link>
        </nav>
        <p className="text-xs text-white/20">
          &copy; {new Date().getFullYear()}{" "}
          <span className="text-copper/60">RS Recruiting</span>.{" "}
          {t("landing.footer.copyright")}
        </p>
      </div>
    </footer>
  );
}

/* ── Public header ───────────────────────────────────────────────────────── */
export function PublicHeader() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const links = [
    { to: "/jobs",    label: t("nav.jobs") },
    { to: "/about",   label: t("nav.about") },
    { to: "/contact", label: t("nav.contact") },
  ];

  return (
    <>
      {/* ── Sticky bar ────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b border-white/6 bg-void/90 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <Logo size={26} />
            <span className="font-wordmark text-base font-light tracking-widest text-gold/55 transition hover:text-gold/80">
              RS Recruiting
            </span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-6 sm:flex">
            {links.map((l) => (
              <Link key={l.to} to={l.to}
                className="text-sm text-white/40 transition hover:text-white/75">
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <Link to="/dashboard"
                className="rounded-sm border border-white/18 px-4 py-1.5 text-sm text-white/55 transition hover:border-copper/50 hover:text-white/90">
                {t("nav.dashboard")}
              </Link>
            ) : (
              <Link to="/login"
                className="rounded-sm bg-copper/10 border border-copper/30 px-4 py-1.5 text-sm text-copper/80 transition hover:bg-copper/20 hover:border-copper/60 hover:text-copper">
                {t("auth.login.submitText")}
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(true)}
            aria-label={t("nav.menu")}
            className="flex size-9 flex-col items-center justify-center gap-[5px] sm:hidden"
          >
            <span className="block h-px w-5 rounded-full bg-white/55 transition-all" />
            <span className="block h-px w-5 rounded-full bg-white/55 transition-all" />
            <span className="block h-px w-3.5 rounded-full bg-white/55 self-end transition-all" />
          </button>
        </div>
      </header>

      {/* ── Mobile overlay ────────────────────────────────────────────── */}
      {/* Rendered regardless of breakpoint so React state persists; visibility
          is controlled by opacity + pointer-events, not display. */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex flex-col bg-void"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
          visibility: open ? "visible" : "hidden",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-3.5">
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-wordmark text-base font-light tracking-widest text-gold/55">
              RS Recruiting
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            className="flex size-9 items-center justify-center text-white/35 transition hover:text-white/70"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col justify-center px-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="group flex items-center justify-between border-b border-white/8 py-6 text-2xl font-light text-white/60 transition-colors duration-200 hover:text-white"
            >
              {l.label}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.5}
                className="size-5 text-copper/40 transition-transform duration-200 group-hover:-translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
          ))}

          {isAuthenticated ? (
            <Link to="/dashboard" onClick={() => setOpen(false)}
              className="mt-8 self-start rounded-sm border border-copper/40 px-6 py-2.5 text-sm text-copper transition hover:bg-copper/10">
              {t("nav.dashboard")}
            </Link>
          ) : (
            <Link to="/login" onClick={() => setOpen(false)}
              className="mt-8 self-start rounded-sm bg-copper px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gold">
              {t("auth.login.submitText")}
            </Link>
          )}
        </nav>

        <p className="px-8 py-6 text-xs text-white/18">
          &copy; {new Date().getFullYear()} RS Recruiting
        </p>
      </div>
    </>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */
function ShellContent({ children }: Props) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return (
      <div className="flex h-screen flex-col">
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main
            key={pathname}
            className="page-enter flex-1 overflow-y-auto bg-page p-4 sm:p-6"
          >
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <PublicHeader />
      <main key={pathname} className="page-enter mx-auto max-w-4xl px-6 py-10 sm:py-14">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

export default function AppShell({ children }: Props) {
  return (
    <ToastProvider>
      <ShellContent>{children}</ShellContent>
      <Toaster />
    </ToastProvider>
  );
}
