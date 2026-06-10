import { useEffect, useState } from "react";
import { getJobs } from "@/services/adminJobs";
import type { JobRead } from "@/types/api";
import { JOBS_CACHE_KEY, LOOKUP_TTL_MS } from "@/hooks/useAdminLookups";
import { getCached } from "@/utils/resourceCache";

/**
 * Jobs for a single company, filtered client-side from the shared
 * JOBS_CACHE_KEY lookup (no backend ?company_id= filter on /admin/jobs yet).
 * Used by CompanyDetailDialog and its mobile inline body.
 */
export function useCompanyJobs(companyId: number | undefined): {
  jobs: JobRead[] | null;
  jobsError: boolean;
} {
  const [jobs, setJobs] = useState<JobRead[] | null>(null);
  const [jobsError, setJobsError] = useState(false);

  useEffect(() => {
    if (companyId == null) return;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setJobs(null);
    setJobsError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    getCached(JOBS_CACHE_KEY, () => getJobs({ limit: 100 }), LOOKUP_TTL_MS)
      .then((page) => {
        if (!cancelled) setJobs(page.items.filter((j) => j.company_id === companyId));
      })
      .catch(() => {
        if (!cancelled) setJobsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { jobs, jobsError };
}
