import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicJob } from "@/services/jobs";
import type { JobPublicRead } from "@/types/api";
import axios from "axios";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JobDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPublicRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/jobs", { replace: true });
      return;
    }

    const jobId = Number.parseInt(id, 10);
    if (!Number.isFinite(jobId)) {
      navigate("/jobs", { replace: true });
      return;
    }

    let cancelled = false;

    async function fetchJob() {
      try {
        const data = await getPublicJob(jobId);
        if (!cancelled) setJob(data);
      } catch (err) {
        if (!cancelled) {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setError(t("publicJobs.detail.unavailable"));
          } else {
            setError(t("publicJobs.detail.errorLoad"));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, t]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="text-white/30">{t("publicJobs.detail.loading")}</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center">
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-6 text-sm text-danger">
          {error ?? t("publicJobs.detail.notFound")}
        </div>
        <Link
          to="/jobs"
          className="mt-6 inline-block text-sm text-white/40 transition hover:text-copper"
        >
          {t("publicJobs.detail.backToJobs")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/jobs"
        className="mb-8 inline-block text-sm text-white/35 transition hover:text-copper"
      >
        {t("publicJobs.detail.backToJobs")}
      </Link>

      <article className="rounded-xl border border-white/8 bg-card p-6 sm:p-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white/95 sm:text-2xl">{job.title}</h1>
            <p className="mt-1.5 text-sm text-white/45">{job.location}</p>
          </div>
          <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
            {t("publicJobs.detail.open")}
          </span>
        </div>
        <p className="mt-2 text-xs text-white/25">
          {t("publicJobs.detail.posted")} {formatDate(job.created_at)}
        </p>

        <div className="my-8 h-px bg-white/8" />

        {/* About the role */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
            {t("publicJobs.detail.aboutRole")}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">
            {job.description}
          </p>
        </div>

        {/* Requirements */}
        <div className="mt-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
            {t("publicJobs.detail.requirements")}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">
            {job.requirements}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10 border-t border-white/8 pt-8">
          <Link
            to={`/jobs/${job.id}/apply`}
            className="inline-block rounded-sm bg-copper px-8 py-3 text-sm font-medium text-white transition hover:bg-gold"
          >
            {t("publicJobs.detail.applyNow")}
          </Link>
        </div>
      </article>
    </div>
  );
}
