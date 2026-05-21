import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateApplicationNotes } from "@/services/adminApplications";
import type { ApplicationWithDetails } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import { textareaCls } from "@/styles/forms";

interface NotesDialogProps {
  app: ApplicationWithDetails | null;
  onClose: () => void;
  onSaved: (next: {
    id: number;
    admin_notes: string | null;
    updated_at: string;
  }) => void;
  onError: () => void;
}

export default function ApplicationNotesDialog({
  app,
  onClose,
  onSaved,
  onError,
}: NotesDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<string>(app?.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!app) return;
    setSaving(true);
    try {
      const updated = await updateApplicationNotes(app.id, notes.trim() ? notes : null);
      onSaved(updated);
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  if (!app) return null;

  return (
    <Dialog
      open={app != null}
      onOpenChange={(o) => !o && onClose()}
      title={t("admin.applications.notesModalTitle")}
      description={app.candidate.full_name}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
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
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        maxLength={5000}
        className={textareaCls}
        placeholder={t("admin.applications.modal.notesPlaceholder")}
      />
      {notes.length > 4800 && (
        <p className="mt-1 text-xs text-white/35">{notes.length} / 5000</p>
      )}
    </Dialog>
  );
}
