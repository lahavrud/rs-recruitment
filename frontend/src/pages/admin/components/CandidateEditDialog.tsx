import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { updateCandidate } from "@/services/adminCandidates";
import type { CandidateProfileRead, CandidateProfileUpdate } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { inputCls } from "@/styles/forms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s().-]{5,20}$/;

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs text-white/45">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export interface CandidateEditDialogProps {
  candidate: CandidateProfileRead | null;
  onClose: () => void;
  onSaved: (next: CandidateProfileRead) => void;
  onError: () => void;
}

export default function CandidateEditDialog({
  candidate,
  onClose,
  onSaved,
  onError,
}: CandidateEditDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CandidateProfileUpdate>({});
  const [initialForm, setInitialForm] = useState<CandidateProfileUpdate>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!candidate) return;
    const seed: CandidateProfileUpdate = {
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone ?? "",
      linkedin_url: candidate.linkedin_url ?? "",
    };
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm(seed);
    setInitialForm(seed);
    setErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [candidate]);

  function set<K extends keyof CandidateProfileUpdate>(key: K, value: CandidateProfileUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key as string]: "" }));
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  function handleClose() {
    if (isDirty) { setConfirmDiscard(true); } else { onClose(); }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.full_name?.trim()) e.full_name = t("common.validation.required");
    else if (form.full_name.trim().length < 2) e.full_name = t("common.validation.tooShort", { min: 2 });
    else if (form.full_name.length > 100) e.full_name = t("common.validation.tooLong", { max: 100 });
    if (!form.email?.trim()) e.email = t("common.validation.required");
    else if (!EMAIL_RE.test(form.email)) e.email = t("common.validation.emailInvalid");
    if (!form.phone?.trim()) e.phone = t("common.validation.required");
    else if (!PHONE_RE.test(form.phone.trim())) {
      e.phone = t("common.validation.phoneInvalid");
    }
    if (form.linkedin_url?.trim()) {
      try {
        const url = new URL(form.linkedin_url);
        if (!url.hostname.endsWith("linkedin.com")) e.linkedin_url = t("common.validation.linkedinInvalid");
      } catch {
        e.linkedin_url = t("common.validation.linkedinInvalid");
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!candidate || !validate()) return;
    setSaving(true);
    const body: CandidateProfileUpdate = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      linkedin_url: form.linkedin_url?.trim() ? form.linkedin_url : null,
    };
    try {
      const updated = await updateCandidate(candidate.id, body);
      onSaved(updated);
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  if (!candidate) return null;

  return (
    <>
      <Dialog
        open={candidate != null}
        onOpenChange={(o) => !o && handleClose()}
        title={t("admin.candidates.editModalTitle")}
        description={candidate.email}
        size="lg"
        footer={
          <>
            <button
              onClick={handleClose}
              disabled={saving}
              className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/60 hover:border-white/40 hover:text-white/90 disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label={t("admin.candidates.fields.fullName")}>
            <input type="text" value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} className={inputCls} />
            {errors.full_name && <p className="mt-1 text-xs text-danger">{errors.full_name}</p>}
          </Field>
          <Field label={t("admin.candidates.fields.email")}>
            <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputCls} />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
          </Field>
          <Field label={t("admin.candidates.fields.phone")}>
            <input type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
            {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone}</p>}
          </Field>
          <Field label={t("admin.candidates.fields.linkedin")}>
            <input type="url" value={form.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} className={inputCls} />
            {errors.linkedin_url && <p className="mt-1 text-xs text-danger">{errors.linkedin_url}</p>}
          </Field>
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={(o) => !o && setConfirmDiscard(false)}
        title={t("common.discardTitle")}
        message={t("common.discardMessage")}
        cancelLabel={t("common.continueEditing")}
        confirmLabel={t("common.discard")}
        variant="danger"
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
      />
    </>
  );
}
