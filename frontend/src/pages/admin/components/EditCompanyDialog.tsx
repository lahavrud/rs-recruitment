import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { updateCompanyProfile } from "@/services/adminCompanies";
import type { CompanyProfileAdminUpdate, CompanyProfileRead } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import CompanyProfileFields, { COMPANY_ID_RE, EMAIL_RE, MOBILE_RE } from "./CompanyProfileFields";

interface EditProps {
  profile: CompanyProfileRead | null;
  onClose: () => void;
  onSaved: (next: CompanyProfileRead) => void;
}

export default function EditCompanyDialog({ profile, onClose, onSaved }: EditProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState<CompanyProfileAdminUpdate>({});
  const [initialForm, setInitialForm] = useState<CompanyProfileAdminUpdate>({});
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const seed: CompanyProfileAdminUpdate = {
      name: profile.name,
      company_id: profile.company_id ?? "",
      address: profile.address ?? "",
      contact_email: profile.contact_email ?? "",
      contact_first_name: profile.contact_first_name ?? "",
      contact_last_name: profile.contact_last_name ?? "",
      contact_mobile_phone: profile.contact_mobile_phone ?? "",
      contact_landline_phone: profile.contact_landline_phone ?? "",
    };
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm(seed);
    setInitialForm(seed);
    setValidationError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  function set<K extends keyof CompanyProfileAdminUpdate>(key: K, value: CompanyProfileAdminUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  function handleClose() {
    if (isDirty) { setConfirmDiscard(true); } else { onClose(); }
  }

  async function handleSave() {
    if (!profile) return;
    if (
      !form.name?.trim() ||
      !form.company_id?.trim() ||
      !form.address?.trim() ||
      !form.contact_email?.trim() ||
      !form.contact_first_name?.trim() ||
      !form.contact_last_name?.trim() ||
      !form.contact_mobile_phone?.trim()
    ) {
      setValidationError(t("common.validation.required")); return;
    }
    if (!COMPANY_ID_RE.test(form.company_id)) {
      setValidationError(t("admin.companies.validation.companyId")); return;
    }
    if (!EMAIL_RE.test(form.contact_email)) {
      setValidationError(t("admin.companies.validation.email")); return;
    }
    if (!MOBILE_RE.test(form.contact_mobile_phone)) {
      setValidationError(t("admin.companies.validation.mobile")); return;
    }
    setSaving(true);
    setValidationError(null);
    try {
      const updated = await updateCompanyProfile(profile.id, {
        ...form,
        contact_landline_phone: form.contact_landline_phone || null,
      });
      onSaved(updated);
    } catch {
      toast.error(t("admin.companies.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <>
    <Dialog
      open={profile != null}
      onOpenChange={(o) => !o && handleClose()}
      title={t("admin.companies.editModalTitle")}
      description={profile.name}
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
      <CompanyProfileFields
        form={form}
        setField={(k, v) =>
          set(
            k as keyof CompanyProfileAdminUpdate,
            v as CompanyProfileAdminUpdate[keyof CompanyProfileAdminUpdate],
          )
        }
      />
      {validationError && <p className="mt-3 text-xs text-danger">{validationError}</p>}
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
