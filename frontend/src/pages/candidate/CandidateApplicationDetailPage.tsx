import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import CompanyName from "@/components/ui/CompanyName";
import {
  fetchApplicationResumeBlob,
  getMyApplication,
  type CandidateApplicationDetail,
} from "@/services/candidate";

/**
 * Read-only view of a single application (Sprint 11 / #609).
 *
 * Shows job snapshot + my submitted answers + the resume snapshot. No
 * raw status, no admin notes, no Edit/Withdraw — those buttons are
 * gated by ``editable`` in the follow-up issue.
 */
export default function CandidateApplicationDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [data, setData] = useState<CandidateApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadResume() {
    if (!data?.resume || downloading) return;
    setDownloading(true);
    try {
      const blob = await fetchApplicationResumeBlob(data.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.resume.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("candidate.applications.errors.generic"));
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const appId = Number(id);
    (async () => {
      if (!Number.isFinite(appId) || appId <= 0) {
        if (alive) {
          setError(t("candidate.applications.errors.notFound"));
          setLoading(false);
        }
        return;
      }
      try {
        const detail = await getMyApplication(appId);
        if (alive) setData(detail);
      } catch (err) {
        if (!alive) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError(t("candidate.applications.errors.notFound"));
        } else {
          setError(t("candidate.applications.errors.loadFailed"));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, t]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-white/60">{t("candidate.applications.loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-danger">{error}</p>
        <Link
          to="/candidate/applications"
          className="mt-4 inline-block text-sm text-white/60 hover:text-white/90"
        >
          {t("candidate.applications.detail.back")}
        </Link>
      </div>
    );
  }

  const answers = data.my_answers;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow={t("candidate.applications.detail.eyebrow")}
        subtitle={data.job.title}
      />

      <div className="mt-4">
        <Link
          to="/candidate/applications"
          className="text-xs text-white/50 hover:text-white/80"
        >
          ← {t("candidate.applications.detail.back")}
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-white/8 bg-card p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("candidate.applications.detail.jobSection")}
        </h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <h3 className="text-xl text-white/90">{data.job.title}</h3>
          <CompanyName name={data.company.name} />
          {data.job.closed && (
            <span className="rounded-sm border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/50">
              {t("candidate.applications.closedPill")}
            </span>
          )}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm text-white/70">
          {data.job.description}
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-white/8 bg-card p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("candidate.applications.detail.myAnswers")}
        </h2>
        <dl className="mt-4 space-y-4">
          <AnswerRow
            label={t("candidate.applications.detail.answers.serviceConcept")}
            value={answers.service_concept}
            emptyLabel={t("candidate.applications.detail.answersEmpty")}
          />
          <AnswerRow
            label={t("candidate.applications.detail.answers.salaryExpectations")}
            value={answers.salary_expectations}
            emptyLabel={t("candidate.applications.detail.answersEmpty")}
          />
          <AnswerRow
            label={t("candidate.applications.detail.answers.strength")}
            value={answers.strength}
            emptyLabel={t("candidate.applications.detail.answersEmpty")}
          />
          <AnswerRow
            label={t("candidate.applications.detail.answers.growthArea")}
            value={answers.growth_area}
            emptyLabel={t("candidate.applications.detail.answersEmpty")}
          />
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-white/8 bg-card p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("candidate.applications.detail.resume")}
        </h2>
        {data.resume ? (
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="truncate text-sm text-white/80">{data.resume.filename}</p>
            <Button
              size="sm"
              onClick={downloadResume}
              disabled={downloading}
              className="shrink-0"
            >
              {downloading
                ? t("candidate.applications.loading")
                : t("candidate.applications.detail.resumeDownload")}
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/55">
            {t("candidate.applications.detail.resumeNone")}
          </p>
        )}
      </section>
    </div>
  );
}

function AnswerRow({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value: string | null;
  emptyLabel: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-white/50">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-white/85">
        {value && value.trim() ? value : <span className="text-white/40">{emptyLabel}</span>}
      </dd>
    </div>
  );
}
