import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicJob } from "@/services/jobs";
import type { JobPublicRead } from "@/types/api";
import axios from "axios";

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "he" ? "he-IL" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JobDetailPage() {
  const { t, i18n } = useTranslation();
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
        <div className="text-gray-400">{t("publicJobs.detail.loading")}</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center">
        <div className="rounded-md bg-red-50 p-6 text-red-700">
          {error ?? t("publicJobs.detail.notFound")}
        </div>
        <Link
          to="/jobs"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          {t("publicJobs.detail.backToJobs")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/jobs"
        className="mb-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        {t("publicJobs.detail.backToJobs")}
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{job.title}</h1>
            <p className="mt-1 text-gray-500">{job.location}</p>
          </div>
          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
            {t("publicJobs.detail.open")}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {t("publicJobs.detail.posted")} {formatDate(job.created_at, i18n.language)}
        </p>

        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">{t("publicJobs.detail.aboutRole")}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {job.description}
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">{t("publicJobs.detail.requirements")}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {job.requirements}
          </p>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 sm:mt-10">
          <Link
            to={`/jobs/${job.id}/apply`}
            className="block rounded-md bg-blue-600 px-6 py-3 text-center text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:inline-block sm:py-2.5"
          >
            {t("publicJobs.detail.applyNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}
