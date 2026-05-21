import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import { inputCls } from "@/styles/forms";
import {
  changePassword,
  deleteResume,
  getMe,
  patchMe,
  requestDataExport,
  uploadResume,
  type CandidateMeRead,
} from "@/services/candidate";

/**
 * Candidate self-service profile (Sprint 11 / #608).
 *
 * Five sections, each owns its own submit-state so a failure on one
 * doesn't grey out the others:
 *  1. Identity         — name + email (email read-only). Only these two
 *                        are mandatory; everything below is optional
 *                        autofill metadata used by the apply form.
 *  2. Apply autofill   — phone + LinkedIn. Both nullable — clear to
 *                        remove. The apply form will prompt the
 *                        candidate inline if a live application is
 *                        missing phone.
 *  3. Resume           — current file + upload (replace) + remove
 *  4. Security         — change-password (current + new + confirm)
 *  5. Your data        — request GDPR export (emailed download link)
 */
export default function CandidateProfilePage() {
  const { t } = useTranslation();
  const [me, setMe] = useState<CandidateMeRead | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Settings group is collapsed by default — it's account controls
  // (password, GDPR export), secondary to the profile content above.
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getMe();
        if (alive) setMe(data);
      } catch {
        if (alive) setLoadError(t("candidate.profile.errors.loadFailed"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="text-white/40">{t("candidate.profile.loading")}</div>
      </div>
    );
  }
  if (loadError || !me) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-6 text-sm text-danger">
          {loadError ?? t("candidate.profile.errors.loadFailed")}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={t("candidate.profile.eyebrow")}
        subtitle={t("candidate.profile.subtitle")}
      />

      {/* ── Profile group ─────────────────────────────────────────────
          Identity sits on a slim, gradient-tinted strip. The
          autofill+resume card below is wider with an internal split
          (2-col on desktop) so phone/LinkedIn and the resume picker
          read as one cluster but visually distinct from identity. */}
      <div className="mt-6 space-y-4">
        <IdentitySection me={me} onChange={setMe} />
        <ApplyAutofillSection me={me} onChange={setMe} />
      </div>

      {/* ── Settings group ────────────────────────────────────────────
          Collapsible — these are account-level controls (password,
          GDPR export), secondary to the profile content above. Default
          collapsed; expanding uses the grid-template-rows 0fr↔1fr
          trick (same as the dashboard's profile-completion expand) so
          the height interpolates without measuring with JS. */}
      <div className="mt-10">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          aria-controls="candidate-settings-panel"
          className="group flex w-full items-center justify-between gap-2 border-b border-white/8 pb-2 transition-colors hover:border-white/15"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 transition-colors group-hover:text-white/60">
            {t("candidate.profile.settings.title")}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`size-4 text-white/40 transition-transform duration-200 ease-out ${
              settingsOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 9 6 6 6-6"
            />
          </svg>
        </button>

        <div
          id="candidate-settings-panel"
          className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
          style={{
            gridTemplateRows: settingsOpen ? "1fr" : "0fr",
            opacity: settingsOpen ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="grid gap-3 pt-3 grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <SecuritySection />
              <DataExportSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Identity ─────────────────────────────────────────────────────────────

function IdentitySection({
  me,
  onChange,
}: {
  me: CandidateMeRead;
  onChange: (next: CandidateMeRead) => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(me.full_name);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setState("idle");
    setError(null);
    try {
      const updated = await patchMe({ full_name: fullName });
      onChange(updated);
      setState("saved");
    } catch (err) {
      setState("error");
      setError(
        axios.isAxiosError(err) && err.response?.status === 422
          ? t("candidate.profile.identity.errors.validation")
          : t("candidate.profile.identity.errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Two-letter initials from the current input (so it updates live as
  // the candidate edits their name) — fall back to the first letter of
  // the email local-part if the name is somehow blank.
  const initials = initialsFor(fullName, me.email);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-card-raised via-card to-card p-5 sm:p-6">
      {/* Subtle copper accent so the hero card visually leads the page
          without looking like every other card below it. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -end-12 size-32 rounded-full bg-copper/10 blur-3xl"
      />
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col gap-4 sm:flex-row sm:items-center"
      >
        {/* Initials avatar — anchors the strip on the start edge. */}
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-copper/30 bg-copper/10 font-wordmark text-lg text-copper sm:size-16 sm:text-xl">
          {initials}
        </div>

        {/* Editable name on top, read-only email below. ``min-w-0`` is
            essential here — without it the ``w-full`` input below
            doesn't actually constrain to the parent flex column and
            the whole row overflows the viewport on narrow screens. */}
        <div className="min-w-0 flex-1 space-y-2">
          <FormField label={t("candidate.profile.identity.fullName")}>
            <input
              type="text"
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFullName(e.target.value)
              }
              className={inputCls}
              required
              minLength={2}
              maxLength={100}
            />
          </FormField>
          <p
            className="truncate text-xs text-white/45"
            title={t("candidate.profile.identity.emailLockedHint")}
          >
            <span dir="ltr">{me.email}</span>
            <span className="mx-1.5 text-white/25">·</span>
            <span className="text-white/30">
              {t("candidate.profile.identity.emailLockedHint")}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? t("candidate.profile.identity.saving")
              : t("candidate.profile.identity.save")}
          </Button>
          <span
            aria-live="polite"
            className={`text-[11px] ${
              state === "saved"
                ? "text-copper"
                : state === "error"
                  ? "text-danger"
                  : "text-transparent"
            }`}
          >
            {state === "saved"
              ? t("candidate.profile.identity.saved")
              : state === "error" && error
                ? error
                : /* keep height stable */ "‎"}
          </span>
        </div>
      </form>
    </section>
  );
}

/** Split a filename into editable basename + locked extension (no dot). */
function splitFilename(name: string | null): { base: string; ext: string } {
  if (!name) return { base: "", ext: "" };
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return { base: name, ext: "" };
  return { base: name.slice(0, idx), ext: name.slice(idx + 1) };
}

function initialsFor(name: string, email: string): string {
  const source = name?.trim() || email.split("@", 1)[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Apply autofill (phone + LinkedIn) ────────────────────────────────────
// These fields exist purely to prefill the public apply form for returning
// candidates. They are NOT identity — clearing them is allowed; the
// apply-form endpoint will prompt for them inline if a live application is
// missing the data. The "live application requires phone+resume" invariant
// lives at the apply endpoint, not on the profile.
function ApplyAutofillSection({
  me,
  onChange,
}: {
  me: CandidateMeRead;
  onChange: (next: CandidateMeRead) => void;
}) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState(me.phone ?? "");
  const [linkedin, setLinkedin] = useState(me.linkedin_url ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setState("idle");
    setError(null);
    try {
      const updated = await patchMe({
        phone: phone.trim() ? phone : null,
        linkedin_url: linkedin.trim() ? linkedin : null,
      });
      onChange(updated);
      setState("saved");
    } catch (err) {
      setState("error");
      setError(
        axios.isAxiosError(err) && err.response?.status === 422
          ? t("candidate.profile.autofill.errors.validation")
          : t("candidate.profile.autofill.errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/8 bg-card p-6">
      <header className="mb-5">
        <h2 className="text-base font-semibold text-white/85">
          {t("candidate.profile.autofill.title")}
        </h2>
        <p className="mt-1 text-xs text-white/45">
          {t("candidate.profile.autofill.subtitle")}
        </p>
      </header>

      {/* Mobile (default) collapses to a single ``minmax(0,1fr)`` track
          so the grid item width is clamped to the parent's width and
          ``w-full`` inputs inside can't push the row past the viewport.
          Without an explicit minmax(0,…) the implicit track has
          ``min-width: auto`` and grows with content. */}
      <div className="grid gap-6 grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Left column: phone + LinkedIn ────────────────────────── */}
        <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
          <FormField
            label={t("candidate.profile.autofill.phone")}
            hint={t("candidate.profile.autofill.phoneHint")}
          >
            <input
              type="tel"
              value={phone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPhone(e.target.value)
              }
              className={inputCls}
              dir="ltr"
              placeholder="050-000-0000"
              maxLength={30}
            />
          </FormField>
          <FormField
            label={t("candidate.profile.autofill.linkedin")}
            hint={t("candidate.profile.autofill.linkedinHint")}
          >
            <input
              type="url"
              value={linkedin}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLinkedin(e.target.value)
              }
              className={inputCls}
              dir="ltr"
              placeholder="https://linkedin.com/in/your-handle"
              maxLength={500}
            />
          </FormField>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs">
              {state === "saved" && (
                <span className="text-copper">
                  {t("candidate.profile.autofill.saved")}
                </span>
              )}
              {state === "error" && error && (
                <span className="text-danger">{error}</span>
              )}
            </div>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? t("candidate.profile.autofill.saving")
                : t("candidate.profile.autofill.save")}
            </Button>
          </div>
        </form>

        {/* ── Right column: resume picker ──────────────────────────── */}
        <ResumeCard me={me} onChange={onChange} />
      </div>
    </section>
  );
}

// ── Resume ───────────────────────────────────────────────────────────────

/**
 * Resume slot inside the apply-autofill card. Visually distinct from
 * the text fields on the left: a labelled, full-height tile with the
 * current resume's filename badge at the top and a drop/upload zone
 * underneath. When no resume is set, the tile becomes a single
 * dashed-border upload affordance.
 */
function ResumeCard({
  me,
  onChange,
}: {
  me: CandidateMeRead;
  onChange: (next: CandidateMeRead) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Rename UX: candidate clicks the displayed filename to swap into
  // edit mode. Only the basename is editable — the extension is locked
  // to the bytes on disk (server enforces; UI rejects too).
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadResume(file);
      onChange(updated);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.status === 422
          ? t("candidate.profile.resume.errors.invalidFile")
          : t("candidate.profile.resume.errors.generic"),
      );
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm(t("candidate.profile.resume.confirmDelete"))) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await deleteResume();
      onChange(updated);
    } catch {
      setError(t("candidate.profile.resume.errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  // Prefer the candidate-supplied label (`resume_filename`); fall back
  // to the basename of the storage key for legacy rows that pre-date
  // the column. The extension is always taken from whichever source we
  // end up displaying — it's the canonical lock for the rename UI.
  const displayName = me.resume_filename
    ? me.resume_filename
    : me.resume_path
      ? me.resume_path.split("/").pop() ?? me.resume_path
      : null;
  const { base: displayBase, ext: displayExt } = splitFilename(displayName);

  function startRename() {
    if (!displayName) return;
    setRenameValue(displayBase);
    setRenaming(true);
    setError(null);
  }
  function cancelRename() {
    setRenaming(false);
    setRenameValue("");
    setError(null);
  }
  async function commitRename() {
    if (!displayName) return;
    const trimmedBase = renameValue.trim();
    // Blank or unchanged → silent cancel. No "save empty" UX path:
    // the candidate intent was clearly to back out, not to wipe the
    // label. They can use the Remove button to clear the resume.
    const nextName = displayExt ? `${trimmedBase}.${displayExt}` : trimmedBase;
    if (!trimmedBase || nextName === displayName) {
      cancelRename();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await patchMe({ resume_filename: nextName });
      onChange(updated);
      setRenaming(false);
      setRenameValue("");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        // Show the server's detail when it's a plain string (the
        // extension-lock and "no stored resume" guards both raise
        // ValueError → detail=str(e)). Falls back to a generic message
        // when the detail is structured (Pydantic validation errors).
        const detail = err.response.data?.detail;
        setError(
          typeof detail === "string"
            ? detail
            : t("candidate.profile.resume.renameErrors.invalid"),
        );
      } else {
        setError(t("candidate.profile.resume.errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <label className="block text-xs text-white/55">
        {t("candidate.profile.resume.title")}
      </label>
      <div className="mt-1.5 flex-1">
        {displayName ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-card-raised px-4 py-5 text-center">
            {/* Icon on top — anchors the card without competing with
                the name underneath. */}
            <span className="flex size-10 items-center justify-center rounded-md bg-copper/15 text-copper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="size-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6"
                />
              </svg>
            </span>

            {/* Filename — click to rename. Edit mode swaps in an input
                that auto-saves on blur (or Enter); Escape cancels. */}
            <div className="w-full min-w-0">
              {renaming ? (
                <div
                  className="flex items-center justify-center gap-1"
                  dir="ltr"
                >
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void commitRename()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      } else if (e.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    autoFocus
                    maxLength={Math.max(1, 100 - (displayExt.length + 1))}
                    className="min-w-0 max-w-full rounded-sm border border-copper/40 bg-well px-2 py-1 text-center text-sm font-medium text-white/90 focus:outline-none focus:ring-1 focus:ring-copper/50"
                    aria-label={t(
                      "candidate.profile.resume.renameInputLabel",
                    )}
                  />
                  {displayExt && (
                    <span className="shrink-0 text-sm text-white/45">
                      .{displayExt}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRename}
                  className="group/rename block w-full min-w-0"
                  title={t("candidate.profile.resume.renameTooltip")}
                >
                  <span
                    className="block truncate text-sm font-medium text-white/85 transition group-hover/rename:text-copper"
                    dir="ltr"
                  >
                    {displayName}
                  </span>
                </button>
              )}
              <p className="mt-1 text-[11px] text-white/40">
                {renaming
                  ? t("candidate.profile.resume.renameHint")
                  : t("candidate.profile.resume.attachedHint")}
              </p>
            </div>

            {/* Replace + Remove always render — even while renaming,
                clicking them blurs the input which commits the rename
                first. Simpler than juggling two action modes. */}
            <div className="flex items-center justify-center gap-2">
              <label className="cursor-pointer rounded-sm border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={busy}
                />
                {t("candidate.profile.resume.replace")}
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="rounded-sm border border-danger/40 px-3 py-1.5 text-xs text-danger/80 transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("candidate.profile.resume.remove")}
              </button>
            </div>
          </div>
        ) : (
          <label className="group flex h-full min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/15 bg-card-raised/40 p-4 text-center transition hover:border-copper/50 hover:bg-card-raised">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleUpload}
              disabled={busy}
            />
            <span className="flex size-10 items-center justify-center rounded-full border border-copper/30 bg-copper/10 text-copper transition group-hover:border-copper/60 group-hover:bg-copper/15">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0-4 4m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                />
              </svg>
            </span>
            <span className="text-sm font-medium text-white/75">
              {t("candidate.profile.resume.upload")}
            </span>
            <span className="text-[11px] text-white/40">
              {t("candidate.profile.resume.uploadHint")}
            </span>
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Security ─────────────────────────────────────────────────────────────

function SecuritySection() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirmNext) {
      setState("error");
      setError(t("candidate.profile.security.errors.mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    setState("idle");
    try {
      await changePassword(current, next);
      setState("saved");
      setCurrent("");
      setNext("");
      setConfirmNext("");
    } catch (err) {
      setState("error");
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError(t("candidate.profile.security.errors.wrongCurrent"));
      } else if (axios.isAxiosError(err) && err.response?.status === 422) {
        setError(t("candidate.profile.security.errors.weakNew"));
      } else if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError(t("candidate.profile.security.errors.tooMany"));
      } else {
        setError(t("candidate.profile.security.errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      icon={
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 11c1.1 0 2-.9 2-2V7a2 2 0 0 0-4 0v2c0 1.1.9 2 2 2Zm-6 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2Z"
          />
        </svg>
      }
      title={t("candidate.profile.security.title")}
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <FormField label={t("candidate.profile.security.current")}>
          <input
            type="password"
            value={current}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value)}
            className={inputCls}
            autoComplete="current-password"
            required
          />
        </FormField>
        <FormField label={t("candidate.profile.security.new")}>
          <input
            type="password"
            value={next}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNext(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
            required
          />
        </FormField>
        <FormField label={t("candidate.profile.security.confirm")}>
          <input
            type="password"
            value={confirmNext}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setConfirmNext(e.target.value)
            }
            className={inputCls}
            autoComplete="new-password"
            required
          />
        </FormField>
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-[11px]">
            {state === "saved" && (
              <span className="text-copper">
                {t("candidate.profile.security.saved")}
              </span>
            )}
            {state === "error" && error && (
              <span className="text-danger">{error}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-sm border border-white/20 px-3 py-1.5 text-xs text-white/80 transition hover:border-copper/50 hover:text-copper disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? t("candidate.profile.security.changing")
              : t("candidate.profile.security.change")}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

// ── Data export ──────────────────────────────────────────────────────────

function DataExportSection() {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "queued" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequest() {
    setBusy(true);
    setError(null);
    setState("idle");
    try {
      await requestDataExport();
      setState("queued");
    } catch (err) {
      setState("error");
      setError(
        axios.isAxiosError(err) && err.response?.status === 429
          ? t("candidate.profile.export.errors.alreadyPending")
          : t("candidate.profile.export.errors.generic"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      icon={
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          />
        </svg>
      }
      title={t("candidate.profile.export.title")}
    >
      <div className="flex flex-1 flex-col gap-3">
        <p className="text-xs text-white/55">
          {t("candidate.profile.export.description")}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-[11px]">
            {state === "queued" && (
              <span className="text-copper">
                {t("candidate.profile.export.queuedMessage")}
              </span>
            )}
            {state === "error" && error && (
              <span className="text-danger">{error}</span>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleRequest}
            className="rounded-sm border border-white/20 px-3 py-1.5 text-xs text-white/80 transition hover:border-copper/50 hover:text-copper disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? t("candidate.profile.export.requesting")
              : t("candidate.profile.export.request")}
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Local helpers ────────────────────────────────────────────────────────

/**
 * Smaller, account-controls card — visually demoted from the profile
 * cards above. Icon-led title in a single row so the header takes less
 * vertical space, lighter border + subtler background, ghost-buttoned
 * actions to keep the surface from competing with the main profile
 * group for attention.
 */
function SettingsCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-white/6 bg-card-raised/40 p-5">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/55">
          {icon}
        </span>
        <h3 className="text-sm font-medium text-white/80">{title}</h3>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

