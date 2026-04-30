import { useEffect, useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { getCandidates, fetchResumeBlob } from "@/services/admin";
import type { CandidateProfileRead } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";

function ResumeLink({ fileKey, label }: { fileKey: string; label: string }) {
  async function open(e: React.MouseEvent) {
    e.stopPropagation();
    const win = window.open("", "_blank");
    if (!win) return;
    try {
      const blob = await fetchResumeBlob(fileKey);
      const url = URL.createObjectURL(blob);
      win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      win.close();
    }
  }
  return (
    <button onClick={open} className="text-copper hover:text-gold">
      {label} ↗
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCandidatesPage() {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState<CandidateProfileRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    getCandidates()
      .then(setCandidates)
      .catch(() => setError(t("admin.candidates.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const filtered = search.trim()
    ? candidates.filter(
        (c) =>
          c.full_name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()),
      )
    : candidates;

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("admin.candidates.title")}
        subtitle={t("admin.candidates.subtitle")}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.candidates.searchPlaceholder")}
          className="w-full rounded-lg border border-white/10 bg-well px-4 py-2 text-sm text-white/80 placeholder:text-white/25 focus:border-copper/40 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-white/25">
          {t("admin.candidates.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-20 text-center text-sm text-white/25">
          {t("admin.candidates.empty")}
        </div>
      ) : (
        <>
          {/* ── Mobile: cards ───────────────────────────────────────────── */}
          <div className="space-y-2 md:hidden">
            {filtered.map((c) => {
              const isExpanded = expandedId === c.id;
              return (
                <div key={c.id} className="overflow-hidden rounded-xl border border-white/8 bg-card">
                  <div
                    onClick={() => toggleExpanded(c.id)}
                    className="flex cursor-pointer items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white/80">{c.full_name}</p>
                      <p className="truncate text-xs text-white/40">{c.email}</p>
                    </div>
                    <span className="mt-0.5 shrink-0 text-xs text-white/35">
                      {formatDate(c.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 border-t border-white/6 px-4 py-2.5 text-sm">
                    {c.phone && <span className="text-white/60">{c.phone}</span>}
                    {c.resume_path && (
                      <ResumeLink
                        fileKey={c.resume_path.split("/").pop() ?? c.resume_path}
                        label={t("admin.candidates.table.resume")}
                      />
                    )}
                    {c.linkedin_url && (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-copper hover:text-gold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        LinkedIn ↗
                      </a>
                    )}
                  </div>

                  {isExpanded && <CandidateDetails c={c} />}
                </div>
              );
            })}
          </div>

          {/* ── Desktop: table ───────────────────────────────────────────── */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/8 bg-card md:block">
            <table className="min-w-full divide-y divide-white/6 text-sm">
              <thead className="bg-well text-xs font-medium uppercase tracking-wide text-white/35">
                <tr>
                  <th className="px-4 py-3 text-start">{t("admin.candidates.table.name")}</th>
                  <th className="px-4 py-3 text-start">{t("admin.candidates.table.phone")}</th>
                  <th className="px-4 py-3 text-start">{t("admin.candidates.table.resume")}</th>
                  <th className="px-4 py-3 text-start">{t("admin.candidates.table.linkedin")}</th>
                  <th className="px-4 py-3 text-start">{t("admin.candidates.table.date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filtered.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        onClick={() => toggleExpanded(c.id)}
                        className="cursor-pointer transition hover:bg-white/3"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-white/80">{c.full_name}</p>
                          <p className="text-xs text-white/40">{c.email}</p>
                        </td>
                        <td className="px-4 py-3 text-white/60">
                          {c.phone ?? <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {c.resume_path ? (
                            <ResumeLink
                              fileKey={c.resume_path.split("/").pop() ?? c.resume_path}
                              label={t("admin.candidates.table.resume")}
                            />
                          ) : (
                            <span className="text-white/20">{t("admin.candidates.noFile")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {c.linkedin_url ? (
                            <a
                              href={c.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-copper hover:text-gold"
                            >
                              LinkedIn ↗
                            </a>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/40">{formatDate(c.created_at)}</td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="border-t border-white/5 bg-card-raised px-5 py-4">
                            <CandidateDetails c={c} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CandidateDetails({ c }: { c: CandidateProfileRead }) {
  const { t } = useTranslation();
  const hasAnswers = c.service_concept || c.salary_expectations || c.personality_strength || c.personality_weakness;

  if (!hasAnswers) {
    return <p className="text-sm text-white/35">{t("admin.candidates.details.noAnswers")}</p>;
  }

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
      {c.service_concept && (
        <>
          <dt className="text-white/35">{t("admin.candidates.details.serviceConcept")}</dt>
          <dd className="text-white/70">{c.service_concept}</dd>
        </>
      )}
      {c.salary_expectations && (
        <>
          <dt className="text-white/35">{t("admin.candidates.details.salaryExpectations")}</dt>
          <dd className="text-white/70">{c.salary_expectations}</dd>
        </>
      )}
      {c.personality_strength && (
        <>
          <dt className="text-white/35">{t("admin.candidates.details.strength")}</dt>
          <dd className="text-white/70">{c.personality_strength}</dd>
        </>
      )}
      {c.personality_weakness && (
        <>
          <dt className="text-white/35">{t("admin.candidates.details.weakness")}</dt>
          <dd className="text-white/70">{c.personality_weakness}</dd>
        </>
      )}
    </dl>
  );
}
