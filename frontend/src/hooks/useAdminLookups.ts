import { useEffect, useState } from "react";
import { getActiveCompanies } from "@/services/adminCompanies";
import { getJobs } from "@/services/adminJobs";
import { getCached } from "@/utils/resourceCache";

const JOBS_CACHE_KEY = "admin-lookups:jobs";
export const ACTIVE_COMPANIES_CACHE_KEY = "admin-lookups:active-companies";
const TTL_MS = 60_000;

export interface AdminJobLookup {
  id: number;
  title: string;
  company_id: number;
}

export interface AdminLookups {
  allJobs: AdminJobLookup[];
  jobTitleById: Map<number, string>;
  companyNameById: Map<number, string>;
}

const EMPTY_LOOKUPS: AdminLookups = {
  allJobs: [],
  jobTitleById: new Map(),
  companyNameById: new Map(),
};

/**
 * Jobs + active-companies lookups used to populate admin filter dropdowns
 * and resolve names for display. Cached for `TTL_MS` and shared across
 * every admin page via `resourceCache` so navigating between admin pages
 * doesn't re-issue the same two requests each time.
 */
export function useAdminLookups(): AdminLookups {
  const [lookups, setLookups] = useState<AdminLookups>(EMPTY_LOOKUPS);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCached(JOBS_CACHE_KEY, () => getJobs({ limit: 100 }), TTL_MS),
      getCached(ACTIVE_COMPANIES_CACHE_KEY, () => getActiveCompanies({ limit: 100 }), TTL_MS),
    ])
      .then(([jobsPage, companiesPage]) => {
        if (cancelled) return;
        setLookups({
          allJobs: jobsPage.items.map((j) => ({
            id: j.id,
            title: j.title,
            company_id: j.company_id,
          })),
          jobTitleById: new Map(jobsPage.items.map((j) => [j.id, j.title])),
          companyNameById: new Map(
            companiesPage.items.map((row) => [row.company_profile.id, row.company_profile.name]),
          ),
        });
      })
      .catch(() => {
        /* best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return lookups;
}
