import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { approveCompany, generateInviteToken, getPendingCompanies, rejectCompany } from "@/services/admin";
import type { PendingCompanyRead } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCompaniesPage() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<PendingCompanyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<number | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  async function handleGenerateInvite() {
    setInviting(true);
    try {
      const token = await generateInviteToken();
      const url = `${window.location.origin}/register?token=${token}`;
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000);
    } catch {
      setError(t("admin.companies.inviteError"));
    } finally {
      setInviting(false);
    }
  }

  useEffect(() => {
    getPendingCompanies()
      .then(setCompanies)
      .catch(() => setError(t("admin.companies.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleApprove(userId: number) {
    setActing(userId);
    try {
      await approveCompany(userId);
      setCompanies((prev) => prev.filter((c) => c.user.id !== userId));
    } catch {
      setError(t("admin.companies.approveError"));
    } finally {
      setActing(null);
    }
  }

  async function handleReject(userId: number) {
    if (!confirm(t("admin.companies.rejectConfirm"))) return;
    setActing(userId);
    try {
      await rejectCompany(userId);
      setCompanies((prev) => prev.filter((c) => c.user.id !== userId));
    } catch {
      setError(t("admin.companies.rejectError"));
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("admin.companies.title")}
        subtitle={t("admin.companies.subtitle")}
        action={
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
                {companies.length} {t("admin.companies.pending")}
              </span>
            )}
            <button
              onClick={handleGenerateInvite}
              disabled={inviting}
              className="rounded-sm bg-copper px-4 py-1.5 text-sm font-medium text-white transition hover:bg-gold disabled:opacity-40"
            >
              {inviting
                ? "…"
                : inviteCopied
                  ? t("admin.companies.inviteCopied")
                  : t("admin.companies.inviteButton")}
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-white/25">{t("admin.companies.loading")}</div>
      ) : companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-20 text-center text-sm text-white/25">
          {t("admin.companies.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => {
            const busy = acting === c.user.id;
            return (
              <div
                key={c.user.id}
                className="flex flex-col gap-4 rounded-xl border border-white/8 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white/85">{c.company_profile.name}</p>
                  <p className="mt-0.5 text-sm text-white/45">{c.user.email}</p>
                  {c.company_profile.contact_person && (
                    <p className="text-sm text-white/45">
                      {t("admin.companies.contactLabel")}: {c.company_profile.contact_person}
                      {c.company_profile.contact_phone && ` · ${c.company_profile.contact_phone}`}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-white/25">
                    {t("admin.companies.registeredLabel")} {formatDate(c.user.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(c.user.id)}
                    disabled={busy}
                    className="rounded-sm bg-success/15 px-4 py-1.5 text-sm font-medium text-success transition hover:bg-success/25 disabled:opacity-40"
                  >
                    {busy ? "…" : t("admin.companies.approve")}
                  </button>
                  <button
                    onClick={() => handleReject(c.user.id)}
                    disabled={busy}
                    className="rounded-sm border border-danger/25 px-4 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-40"
                  >
                    {busy ? "…" : t("admin.companies.reject")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
