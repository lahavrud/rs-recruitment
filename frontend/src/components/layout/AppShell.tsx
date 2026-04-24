import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface Props {
  children: ReactNode;
}

function PublicHeader() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4">
        <Link
          to="/"
          className="text-base font-semibold text-ink hover:text-copper sm:text-lg"
        >
          {t("auth.appName")}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/jobs" className="text-sm text-ink-2 hover:text-ink">
            {t("nav.jobs")}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="rounded-md bg-copper px-3 py-1.5 text-sm font-medium text-white hover:bg-gold sm:px-4"
            >
              {t("nav.dashboard")}
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-copper px-3 py-1.5 text-sm font-medium text-white hover:bg-gold sm:px-4"
            >
              {t("auth.login.submitText")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function AppShell({ children }: Props) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
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
            className="page-enter flex-1 overflow-y-auto bg-canvas p-4 sm:p-6"
          >
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main
        key={pathname}
        className="page-enter mx-auto max-w-5xl px-4 py-6 sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}
