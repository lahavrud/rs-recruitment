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
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4">
        <Link
          to="/jobs"
          className="text-base font-semibold text-gray-900 hover:text-blue-600 sm:text-lg"
        >
          {t("auth.appName")}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/jobs" className="text-sm text-gray-600 hover:text-gray-900">
            {t("nav.jobs")}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
            >
              {t("nav.dashboard")}
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
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

  if (pathname === "/login" || pathname === "/register") {
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
            className="page-enter flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6"
          >
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
