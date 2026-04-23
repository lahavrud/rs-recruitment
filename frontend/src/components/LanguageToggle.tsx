import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  function toggle() {
    const next = i18n.language === "he" ? "en" : "he";
    i18n.changeLanguage(next);
    try {
      localStorage.setItem("i18nextLng", next);
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "he" ? "rtl" : "ltr";
  }, [i18n.language]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      aria-label={`Switch to ${i18n.language === "he" ? "English" : "Hebrew"}`}
    >
      {i18n.language === "he" ? "EN" : "עב"}
    </button>
  );
}
