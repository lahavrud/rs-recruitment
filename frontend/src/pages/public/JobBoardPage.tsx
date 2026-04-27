import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicJobs } from "@/services/jobs";
import type { JobPublicRead } from "@/types/api";
import axios from "axios";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export default function JobBoardPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobPublicRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobs() {
      try {
        const data = await getPublicJobs();
        if (!cancelled) setJobs(data);
      } catch (err) {
        if (!cancelled) {
          if (axios.isAxiosError(err)) {
            setError(t("publicJobs.board.errorLoad"));
          } else {
            setError(t("publicJobs.board.errorGeneric"));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="text-white/30">{t("publicJobs.board.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger/10 p-6 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10 sm:mb-12">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          RS Recruiting
        </p>
        <div className="mt-3 h-px w-8 bg-copper/40" />
        <h1 className="mt-5 text-2xl font-semibold text-white/90 sm:text-3xl">
          {t("publicJobs.board.title")}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          {t("publicJobs.board.subtitle")}
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-24 text-center text-sm text-white/30">
          {t("publicJobs.board.noPositions")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="group block rounded-xl border border-white/8 bg-card p-6 transition duration-200 hover:border-copper/25 hover:bg-card-raised"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-medium text-white/85 transition duration-200 group-hover:text-white/95">
                    {job.title}
                  </h2>
                  <p className="mt-1 text-sm text-white/40">{job.location}</p>
                </div>
                <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                  {t("publicJobs.board.open")}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                {truncate(job.description, 160)}
              </p>
              <p className="mt-4 text-xs text-white/25">
                {t("publicJobs.board.posted")} {formatDate(job.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
