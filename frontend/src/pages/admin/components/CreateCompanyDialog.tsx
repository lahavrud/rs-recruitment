import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminCreateCompany } from "@/services/adminCompanies";
import type { CompanyProfileAdminCreate, CompanyProfileRead } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { focusFirstError } from "@/utils/focusFirstError";
import CompanyProfileFields from "./CompanyProfileFields";
import { COMPANY_ID_RE, EMAIL_RE, MOBILE_RE } from "@/utils/validation";

const CREATE_COMPANY_FIELD_ORDER = [
  "name",
  "company_id",
  "address",
  "contact_email",
  "contact_first_name",
  "contact_last_name",
  "contact_mobile_phone",
] as const;

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: (profile: CompanyProfileRead) => void;
}

export default function CreateCompanyDialog({ open, onClose, onCreated }: CreateProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState<Partial<CompanyProfileAdminCreate>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDirty = Object.values(form).some((v) => v != null && v !== "");

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm({});
    setErrors({});
    setConfirmCreateOpen(false);
    setConfirmDiscard(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  function requestClose() {
    if (!saving && isDirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  }

  function set<K extends keyof CompanyProfileAdminCreate>(
    key: K,
    value: CompanyProfileAdminCreate[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear that field's error on edit.
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = t("common.validation.required");
    if (!form.company_id?.trim())
      e.company_id = t("common.validation.required");
    else if (!COMPANY_ID_RE.test(form.company_id))
      e.company_id = t("admin.companies.validation.companyId");
    if (!form.address?.trim()) e.address = t("common.validation.required");
    if (!form.contact_email?.trim())
      e.contact_email = t("common.validation.required");
    else if (!EMAIL_RE.test(form.contact_email))
      e.contact_email = t("admin.companies.validation.email");
    if (!form.contact_first_name?.trim())
      e.contact_first_name = t("common.validation.required");
    if (!form.contact_last_name?.trim())
      e.contact_last_name = t("common.validation.required");
    if (!form.contact_mobile_phone?.trim())
      e.contact_mobile_phone = t("common.validation.required");
    else if (!MOBILE_RE.test(form.contact_mobile_phone))
      e.contact_mobile_phone = t("admin.companies.validation.mobile");
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e, CREATE_COMPANY_FIELD_ORDER);
      return false;
    }
    return true;
  }

  function requestSave() {
    if (!validate()) return;
    setConfirmCreateOpen(true);
  }

  async function executeSave() {
    setConfirmCreateOpen(false);
    setSaving(true);
    try {
      const created = await adminCreateCompany({
        name: form.name!,
        company_id: form.company_id!,
        address: form.address!,
        contact_email: form.contact_email!,
        contact_first_name: form.contact_first_name!,
        contact_last_name: form.contact_last_name!,
        contact_mobile_phone: form.contact_mobile_phone!,
        contact_landline_phone: form.contact_landline_phone || null,
      });
      toast.success(t("admin.companies.createdToast"));
      onCreated(created);
    } catch {
      toast.error(t("admin.companies.errors.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => { if (!o) requestClose(); }}
        title={t("admin.companies.newCompanyModalTitle")}
        description={t("admin.companies.newCompanyModalDescription")}
        size="lg"
        footer={
          <>
            <button
              onClick={requestClose}
              disabled={saving}
              className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/60 hover:border-white/40 hover:text-white/90 disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={requestSave}
              disabled={saving}
              className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white transition active:scale-95 hover:bg-gold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("admin.companies.createSubmit")}
            </button>
          </>
        }
      >
        <CompanyProfileFields
          form={form}
          setField={(k, v) =>
            set(
              k as keyof CompanyProfileAdminCreate,
              v as CompanyProfileAdminCreate[keyof CompanyProfileAdminCreate],
            )
          }
          errors={errors}
          showRequired
        />
        {hasErrors && (
          <p className="mt-3 text-xs text-danger">
            {t("admin.companies.validation.fixErrors")}
          </p>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmCreateOpen}
        onOpenChange={(o) => !o && setConfirmCreateOpen(false)}
        title={t("admin.companies.createConfirmTitle")}
        message={t("admin.companies.createConfirmMessage", { name: form.name })}
        confirmLabel={t("admin.companies.createSubmit")}
        onConfirm={executeSave}
      />
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
