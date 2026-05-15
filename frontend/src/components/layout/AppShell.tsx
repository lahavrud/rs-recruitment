import { type ReactNode, useEffect, useState } from "react";
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

export function PublicHeader() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const navLinks = [
    { to: "/jobs",    label: t("nav.jobs") },
    { to: "/about",   label: t("nav.about") },
    { to: "/contact", label: t("nav.contact") },
  ];

  return (
    <>
      <header className="border-b border-white/8 bg-void">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-sm font-medium tracking-wide text-white/60 transition hover:text-white/85">
              {t("auth.appName")}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 sm:flex">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to}
                className="text-sm text-white/40 transition hover:text-white/70">
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <Link to="/dashboard"
                className="rounded-sm border border-white/20 px-4 py-1.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white/90">
                {t("nav.dashboard")}
              </Link>
            ) : (
              <Link to="/login"
                className="rounded-sm border border-white/20 px-4 py-1.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white/90">
                {t("auth.login.submitText")}
              </Link>
            )}
          </nav>

          {/* Mobile: login button + hamburger */}
          <div className="flex items-center gap-3 sm:hidden">
            {!isAuthenticated && (
              <Link to="/login"
                className="rounded-sm border border-white/20 px-3 py-1 text-xs text-white/60 transition hover:border-white/40 hover:text-white/90">
                {t("auth.login.submitText")}
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label={t("nav.menu")}
              className="flex size-8 flex-col items-center justify-center gap-1.5"
            >
              <span className="block h-px w-5 bg-white/50" />
              <span className="block h-px w-5 bg-white/50" />
              <span className="block h-px w-3 bg-white/50 self-end" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen overlay */}
      <div
        className="fixed inset-0 z-50 flex flex-col bg-void transition-opacity duration-300 sm:hidden"
        style={{ opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? "auto" : "none" }}
        aria-hidden={!menuOpen}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-sm font-medium tracking-wide text-white/60">
              {t("auth.appName")}
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label={t("common.close")}
            className="flex size-8 items-center justify-center text-white/40 transition hover:text-white/80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links — large, staggered */}
        <nav className="flex flex-1 flex-col justify-center gap-1 px-8">
          {navLinks.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className="border-b border-white/6 py-5 text-2xl font-light text-white/70 transition-colors duration-200 hover:text-white"
              style={{
                transitionDelay: menuOpen ? `${i * 60}ms` : "0ms",
                transform: menuOpen ? "none" : "translateY(8px)",
                opacity: menuOpen ? 1 : 0,
                transition: `opacity 0.3s ease ${i * 60}ms, transform 0.3s ease ${i * 60}ms, color 0.2s ease`,
              }}
            >
              {l.label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="mt-4 self-start rounded-sm border border-copper/40 px-5 py-2 text-sm text-copper transition hover:border-copper hover:bg-copper/10"
            >
              {t("nav.dashboard")}
            </Link>
          )}
        </nav>

        {/* Footer */}
        <p className="px-8 py-6 text-xs text-white/20">
          &copy; {new Date().getFullYear()} RS Recruiting
        </p>
      </div>
    </>
  );
}

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
          {/* key={pathname} unmounts/remounts on every navigation to trigger the
              page-enter animation. Routes must not rely on cross-page state. */}
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
      {/* key={pathname}: same as authenticated shell above — triggers page-enter animation on navigation */}
      <main key={pathname} className="page-enter mx-auto max-w-4xl px-6 py-10 sm:py-14">
        {children}
      </main>
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
