import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-md p-1.5 text-ink-3 hover:bg-subtle hover:text-ink-2 md:hidden"
          aria-label={t("nav.toggleNavigation")}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-ink sm:text-lg">{t("auth.appName")}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <span className="hidden max-w-[140px] truncate text-sm text-ink-2 sm:block">
          {user?.email}
        </span>
        <span className="hidden rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium text-ink-2 sm:inline-block">
          {user?.role}
        </span>
        <button
          onClick={logout}
          className="rounded-md px-3 py-1.5 text-sm text-ink-2 hover:bg-subtle hover:text-ink"
        >
          {t("header.logout")}
        </button>
      </div>
    </header>
  );
}
