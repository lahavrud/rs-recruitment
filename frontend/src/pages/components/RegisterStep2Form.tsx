import { type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import SignatureCanvas, { type SignatureCanvasRef } from "@/components/ui/SignatureCanvas";

interface FieldErrors {
  signature?: string;
  terms?: string;
  privacy?: string;
}

interface RegisterStep2FormProps {
  fieldErrors: FieldErrors;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  submitting: boolean;
  sigCanvasRef: RefObject<SignatureCanvasRef | null>;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
  onOpenContract: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onSignatureBegin: () => void;
  onBack: () => void;
  onSubmit: (e: FormEvent) => void;
}

export default function RegisterStep2Form({
  fieldErrors,
  termsAccepted,
  privacyAccepted,
  submitting,
  sigCanvasRef,
  onTermsChange,
  onPrivacyChange,
  onOpenContract,
  onOpenTerms,
  onOpenPrivacy,
  onSignatureBegin,
  onBack,
  onSubmit,
}: RegisterStep2FormProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/8 bg-card px-5 py-5 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
            {t("auth.register.agreementSection")}
          </p>

          {/* Contract */}
          <div className="rounded-lg border border-white/6 bg-card-raised px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/60">
                {t("auth.register.agreementSectionService")}
              </p>
              <button
                type="button" onClick={onOpenContract}
                className="text-[11px] text-copper/70 transition hover:text-copper"
              >
                {t("auth.register.agreementReadFull")}
              </button>
            </div>
            <div className="mt-2 max-h-20 overflow-y-auto [scrollbar-width:thin]">
              <p className="text-xs leading-relaxed text-white/30">
                {t("auth.register.agreementTextService")}
              </p>
            </div>
          </div>

          {/* Site Terms of Service */}
          <div className="rounded-lg border border-white/6 bg-card-raised px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/60">
                {t("auth.register.agreementSectionSiteTerms")}
              </p>
              <button
                type="button" onClick={onOpenTerms}
                className="text-[11px] text-copper/70 transition hover:text-copper"
              >
                {t("auth.register.agreementReadFull")}
              </button>
            </div>
            <div className="mt-2 max-h-20 overflow-y-auto [scrollbar-width:thin]">
              <p className="text-xs leading-relaxed text-white/30">
                {t("auth.register.agreementTextSiteTermsPreview")}
              </p>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-white/60">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => onTermsChange(e.target.checked)}
                className="accent-copper"
              />
              {t("auth.register.termsCheckboxLabel")}
            </label>
            {fieldErrors.terms && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.terms}</p>
            )}
          </div>

          {/* Privacy */}
          <div className="rounded-lg border border-white/6 bg-card-raised px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/60">
                {t("auth.register.agreementSectionPrivacy")}
              </p>
              <button
                type="button" onClick={onOpenPrivacy}
                className="text-[11px] text-copper/70 transition hover:text-copper"
              >
                {t("auth.register.agreementReadFull")}
              </button>
            </div>
            <div className="mt-2 max-h-20 overflow-y-auto [scrollbar-width:thin]">
              <p className="text-xs leading-relaxed text-white/30">
                {t("auth.register.agreementTextPrivacyPreview")}
              </p>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-white/60">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => onPrivacyChange(e.target.checked)}
                className="accent-copper"
              />
              {t("auth.register.privacyCheckboxLabel")}
            </label>
            {fieldErrors.privacy && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.privacy}</p>
            )}
          </div>

          {/* Signature */}
          <div>
            <p className="mb-2 text-xs text-white/45">
              {t("auth.register.signatureLabel")} <span className="text-copper/60">*</span>
            </p>
            <SignatureCanvas
              ref={sigCanvasRef}
              hasError={!!fieldErrors.signature}
              onBegin={onSignatureBegin}
            />
            {fieldErrors.signature && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.signature}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-sm border border-white/15 px-4 py-2.5 text-sm text-white/55 transition hover:border-white/30 hover:text-white/80"
          >
            → {t("auth.register.backStep")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-[2] rounded-sm bg-copper px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t("auth.register.submittingText") : t("auth.register.submitText")}
          </button>
        </div>
      </div>
    </form>
  );
}
