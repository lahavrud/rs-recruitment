import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { apiErrorKey } from "@/utils/apiError";
import { getActiveCompanies } from "@/services/adminCompanies";
import {
  approveJob,
  deleteJob,
  getJob,
  getJobs,
  rejectJob,
} from "@/services/adminJobs";
import type { JobRead } from "@/types/api";
import { JobStatus } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import TableSkeleton from "@/components/ui/TableSkeleton";
import MobileListSkeleton from "@/components/admin/MobileListSkeleton";
import { useInfiniteList, type CursorPage } from "@/hooks/useInfiniteList";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import DetailJobDialog from "./components/DetailJobDialog";
import EditJobDialog from "./components/EditJobDialog";
import CreateJobDialog from "./components/CreateJobDialog";
import JobsFilterPanel from "./components/JobsFilterPanel";
import JobsList from "./components/JobsList";
import JobsTable from "./components/JobsTable";

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: "bg-warning/10 text-warning",
  PUBLISHED: "bg-success/10 text-success",
  CLOSED: "bg-white/8 text-white/45",
};

const ALL_FILTER = "ALL";
type FilterValue = string;

// ── Page ────────────────────────────────────────────────────────────────────

export default function AdminJobsPage() {
  const { t } = useTranslation();
  usePageTitle(t("admin.jobs.title"));
  const toast = useToast();

  const [filter, setFilter] = useState<FilterValue>(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (
      s === JobStatus.PENDING_APPROVAL ||
      s === JobStatus.PUBLISHED ||
      s === JobStatus.CLOSED
    ) {
      return s;
    }
    return ALL_FILTER;
  });

  const fetcher = useCallback(
    (cursor: string | null): Promise<CursorPage<JobRead>> => {
      const params: { status?: JobStatus; cursor: string | null } = { cursor };
      if (filter !== ALL_FILTER) params.status = filter as JobStatus;
      return getJobs(params);
    },
    [filter],
  );

  const {
    items: jobs,
    isLoading,
    isFetchingMore,
    error,
    sentinelRef,
    reload,
    prependItem,
    updateItem,
    removeItem,
  } = useInfiniteList<JobRead>(fetcher);

  const [detail, setDetail] = useState<JobRead | null>(null);
  const [editing, setEditing] = useState<JobRead | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletePending, setDeletePending] = useState<JobRead | null>(null);
  const [rejectPending, setRejectPending] = useState<JobRead | null>(null);
  const [pendingMutation, setPendingMutation] = useState(false);

  // Client-side filters (applied to the loaded set).
  // Status is the only filter that re-fetches server-side (see fetcher above);
  // everything else narrows the in-memory result.
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState<number[]>([]);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [salaryRange, setSalaryRange] = useState<[number, number] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const uniqueLocations = useMemo(() => {
    const seen = new Set<string>();
    for (const j of jobs) if (j.location) seen.add(j.location.trim());
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "he"));
  }, [jobs]);

  const uniqueCompanies = useMemo(() => {
    const seen = new Set<number>();
    for (const j of jobs) seen.add(j.company_id);
    return Array.from(seen);
  }, [jobs]);

  const salaryBounds = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const j of jobs) {
      if (j.salary_min != null) lo = Math.min(lo, j.salary_min);
      if (j.salary_max != null) hi = Math.max(hi, j.salary_max);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) {
      return { min: 0, max: 50000 };
    }
    return { min: Math.floor(lo / 500) * 500, max: Math.ceil(hi / 500) * 500 };
  }, [jobs]);

  const effectiveSalaryRange = useMemo<[number, number]>(() => {
    if (!salaryRange) return [salaryBounds.min, salaryBounds.max];
    return [
      Math.max(salaryBounds.min, Math.min(salaryRange[0], salaryBounds.max)),
      Math.max(salaryBounds.min, Math.min(salaryRange[1], salaryBounds.max)),
    ];
  }, [salaryRange, salaryBounds]);

  const isSalaryActive =
    effectiveSalaryRange[0] !== salaryBounds.min ||
    effectiveSalaryRange[1] !== salaryBounds.max;

  const filteredJobs = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return jobs.filter((j) => {
      if (q) {
        const reqsText = j.requirements.map((r) => r.text).join(" ");
        const tagsText = j.tags.join(" ");
        const matches = [
          j.title,
          j.location,
          j.short_description,
          j.description,
          reqsText,
          tagsText,
        ].some((s) => s.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedLocations.length > 0 && !selectedLocations.includes(j.location.trim())) return false;
      if (companyFilter.length > 0 && !companyFilter.includes(j.company_id)) return false;
      if (featuredOnly && !j.is_featured) return false;
      if (isSalaryActive) {
        const [filterLo, filterHi] = effectiveSalaryRange;
        if (j.salary_min != null || j.salary_max != null) {
          const jobLo = j.salary_min ?? Number.NEGATIVE_INFINITY;
          const jobHi = j.salary_max ?? Number.POSITIVE_INFINITY;
          if (!(jobHi >= filterLo && jobLo <= filterHi)) return false;
        }
      }
      return true;
    });
  }, [
    jobs,
    debouncedQuery,
    selectedLocations,
    companyFilter,
    featuredOnly,
    effectiveSalaryRange,
    isSalaryActive,
  ]);

  const activeFilterCount =
    (debouncedQuery.trim() ? 1 : 0) +
    selectedLocations.length +
    companyFilter.length +
    (featuredOnly ? 1 : 0) +
    (isSalaryActive ? 1 : 0);

  function clearFilters() {
    setQuery("");
    setSelectedLocations([]);
    setCompanyFilter([]);
    setFeaturedOnly(false);
    setSalaryRange(null);
  }

  // Load company names + emails for the filter chip and the mailto action.
  const [companyNameById, setCompanyNameById] = useState<Map<number, string>>(
    new Map(),
  );
  const [companyEmailById, setCompanyEmailById] = useState<Map<number, string>>(
    new Map(),
  );
  useEffect(() => {
    if (uniqueCompanies.length === 0) return;
    const ctrl = new AbortController();
    getActiveCompanies({ limit: 100 }, ctrl.signal)
      .then((page) => {
        const names = new Map<number, string>();
        const emails = new Map<number, string>();
        for (const row of page.items) {
          names.set(row.company_profile.id, row.company_profile.name);
          if (row.user?.email) {
            emails.set(row.company_profile.id, row.user.email);
          }
        }
        setCompanyNameById(names);
        setCompanyEmailById(emails);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [uniqueCompanies.length]);

  function openMailToCompany(job: JobRead) {
    const email = companyEmailById.get(job.company_id);
    if (!email) {
      toast.error(t("admin.jobs.emailNoAddress"));
      return;
    }
    const subject = encodeURIComponent(
      t("admin.jobs.emailSubjectPrefix", { title: job.title }),
    );
    window.open(`mailto:${email}?subject=${subject}`, "_self");
  }

  // Auto-open detail modal when navigated from another page via ?detail=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("detail");
    if (!id || Number.isNaN(Number(id))) return;
    const ctrl = new AbortController();
    window.history.replaceState({}, "", window.location.pathname);
    getJob(Number(id), ctrl.signal)
      .then((job) => setDetail(job))
      .catch((e) => {
        if (axios.isCancel(e)) return;
        toast.error(t(apiErrorKey(e)));
      });
    return () => ctrl.abort();
  }, [t, toast]);

  const STATUS_LABELS: Record<string, string> = {
    PENDING_APPROVAL: t("admin.jobs.statusLabels.PENDING_APPROVAL"),
    PUBLISHED: t("admin.jobs.statusLabels.PUBLISHED"),
    CLOSED: t("admin.jobs.statusLabels.CLOSED"),
  };

  async function handleApprove(job: JobRead) {
    try {
      const updated = await approveJob(job.id);
      updateItem((j) => j.id === job.id, updated);
      toast.success(t("admin.jobs.approvedToast"));
    } catch {
      toast.error(t("admin.jobs.approveError"));
    }
  }

  async function handleRejectConfirm() {
    if (!rejectPending) return;
    setPendingMutation(true);
    try {
      await rejectJob(rejectPending.id);
      // Backend sets status to CLOSED on reject
      updateItem((j) => j.id === rejectPending.id, {
        ...rejectPending,
        status: JobStatus.CLOSED,
      });
      toast.success(t("admin.jobs.rejectedToast"));
      setRejectPending(null);
    } catch {
      toast.error(t("admin.jobs.rejectError"));
    } finally {
      setPendingMutation(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletePending) return;
    setPendingMutation(true);
    try {
      await deleteJob(deletePending.id);
      removeItem((j) => j.id === deletePending.id);
      toast.success(t("admin.jobs.deletedToast"));
      setDeletePending(null);
      setDetail(null);
    } catch {
      toast.error(t("admin.jobs.errors.deleteFailed"));
    } finally {
      setPendingMutation(false);
    }
  }

  return (
    <div>
      <h1 data-page-heading className="sr-only">
        {t("admin.jobs.title")}
      </h1>
      <PageHeader
        eyebrow={t("admin.jobs.title")}
        subtitle={t("admin.jobs.subtitle")}
        action={
          <button
            onClick={() => setCreating(true)}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold"
          >
            {t("admin.jobs.newJob")}
          </button>
        }
      />

      <JobsFilterPanel
        query={query}
        onQueryChange={setQuery}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        activeFilterCount={activeFilterCount}
        statusFilter={filter}
        onStatusFilterChange={setFilter}
        statusLabels={STATUS_LABELS}
        uniqueLocations={uniqueLocations}
        selectedLocations={selectedLocations}
        onSelectedLocationsChange={setSelectedLocations}
        salaryBounds={salaryBounds}
        effectiveSalaryRange={effectiveSalaryRange}
        isSalaryActive={isSalaryActive}
        onSalaryRangeChange={setSalaryRange}
        uniqueCompanies={uniqueCompanies}
        companyFilter={companyFilter}
        onCompanyFilterChange={setCompanyFilter}
        companyNameById={companyNameById}
        featuredOnly={featuredOnly}
        onFeaturedOnlyChange={setFeaturedOnly}
      />

      {isLoading ? (
        <>
          <div className="md:hidden">
            <MobileListSkeleton rows={6} />
          </div>
          <div className="hidden md:block">
            <TableSkeleton rows={6} columns={4} />
          </div>
        </>
      ) : error ? (
        <ErrorState message={t("admin.jobs.loadError")} onRetry={reload} />
      ) : jobs.length === 0 ? (
        <EmptyState eyebrow={t("admin.jobs.title")} headline={t("admin.jobs.empty")} />
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/40">
            {t("publicJobs.board.noResults")}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-xs text-copper/70 transition hover:text-copper"
          >
            {t("publicJobs.board.clearFilters")}
          </button>
        </div>
      ) : (
        <>
          <JobsList
            jobs={filteredJobs}
            statusLabels={STATUS_LABELS}
            statusColors={STATUS_COLORS}
            companyNameById={companyNameById}
            onEdit={setEditing}
            onMailTo={openMailToCompany}
            onApprove={handleApprove}
            onReject={setRejectPending}
            onDelete={setDeletePending}
          />
          <JobsTable
            jobs={filteredJobs}
            statusLabels={STATUS_LABELS}
            statusColors={STATUS_COLORS}
            onView={setDetail}
            onEdit={setEditing}
            onMailTo={openMailToCompany}
            onApprove={handleApprove}
            onReject={setRejectPending}
            onDelete={setDeletePending}
          />
          <div ref={sentinelRef} />
          {isFetchingMore && (
            <p className="mt-4 text-center text-xs text-white/30">
              {t("common.loading")}
            </p>
          )}
        </>
      )}

      <DetailJobDialog
        job={detail}
        statusLabels={STATUS_LABELS}
        statusColors={STATUS_COLORS}
        companyName={detail ? companyNameById.get(detail.company_id) : undefined}
        onClose={() => setDetail(null)}
        onEdit={() => {
          if (detail) setEditing(detail);
          setDetail(null);
        }}
        onDelete={() => {
          if (detail) setDeletePending(detail);
          setDetail(null);
        }}
        onApprove={() => {
          if (detail) handleApprove(detail);
          setDetail(null);
        }}
        onReject={() => {
          if (detail) setRejectPending(detail);
          setDetail(null);
        }}
      />

      <EditJobDialog
        job={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          updateItem((j) => j.id === updated.id, updated);
          toast.success(t("admin.jobs.savedToast"));
          setEditing(null);
        }}
        onError={() => toast.error(t("admin.jobs.errors.saveFailed"))}
      />

      <CreateJobDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(created) => {
          prependItem(created);
          toast.success(t("admin.jobs.createdToast"));
          setCreating(false);
        }}
        onError={() => toast.error(t("admin.jobs.errors.createFailed"))}
      />

      <ConfirmDialog
        open={rejectPending != null}
        onOpenChange={(o) => !o && setRejectPending(null)}
        title={t("admin.jobs.rejectConfirmTitle")}
        message={t("admin.jobs.rejectConfirm")}
        confirmLabel={t("admin.jobs.reject")}
        variant="danger"
        isPending={pendingMutation}
        onConfirm={handleRejectConfirm}
      />

      <ConfirmDialog
        open={deletePending != null}
        onOpenChange={(o) => !o && setDeletePending(null)}
        title={t("admin.jobs.deleteConfirmTitle")}
        message={t("admin.jobs.deleteConfirmMessage")}
        confirmLabel={t("admin.jobs.deleteConfirmYes")}
        variant="danger"
        isPending={pendingMutation}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
