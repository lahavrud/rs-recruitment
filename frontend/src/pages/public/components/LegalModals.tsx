import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export function PrivacyModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-xl border border-white/10 bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-3.5">
          <h2 className="text-sm font-medium text-white/80">
            {t("publicJobs.application.privacyConsentTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 transition hover:text-white/70"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
          {t("auth.register.agreementTextPrivacy")
            .split("\n\n")
            .map((para, i) => (
              <p key={i} className="text-sm leading-7 text-white/55">
                {para}
              </p>
            ))}
        </div>
        <div className="shrink-0 border-t border-white/8 px-5 py-3 text-left">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-copper px-5 py-2 text-sm font-medium text-white transition hover:bg-gold"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function TermsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-xl border border-white/10 bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-3.5">
          <h2 className="text-sm font-medium text-white/80">
            {t("publicJobs.application.termsConsentTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 transition hover:text-white/70"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
          {t("auth.register.agreementTextSiteTerms")
            .split("\n\n")
            .map((para, i) => (
              <p key={i} className="text-sm leading-7 text-white/55">
                {para}
              </p>
            ))}
        </div>
        <div className="shrink-0 border-t border-white/8 px-5 py-3 text-left">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-copper px-5 py-2 text-sm font-medium text-white transition hover:bg-gold"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
