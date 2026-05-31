import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useTranslation } from "react-i18next";
import { getActiveCompanies } from "@/services/adminCompanies";
import { getJobs } from "@/services/adminJobs";
import {
  deleteApplication,
  getApplications,
} from "@/services/adminApplications";
import type { ApplicationListParams } from "@/services/adminApplications";
import { ApplicationStatus } from "@/types/api";
import type { ApplicationWithDetails } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import TableSkeleton from "@/components/ui/TableSkeleton";
import MobileListSkeleton from "@/components/admin/MobileListSkeleton";
import SearchInput from "@/components/ui/SearchInput";
import FunnelIcon from "@/components/admin/FunnelIcon";
import ActiveFilterChip from "@/components/admin/ActiveFilterChip";
import { useInfiniteList, type CursorPage } from "@/hooks/useInfiniteList";
import { useAutoOpenFromRouteState } from "@/hooks/useAutoOpenFromRouteState";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { DetailDialog } from "./components/ApplicationDetailDialog";
import { ApplicationStatusDialog } from "./components/ApplicationStatusDialog";
import { ApplicationNotesDialog } from "./components/ApplicationNotesDialog";
import { ApplicationsFilterPanel } from "./components/ApplicationsFilterPanel";
import { ApplicationsTable } from "./components/ApplicationsTable";
import { ApplicationsMobileList } from "./components/ApplicationsMobileList";

const ALL_FILTER = "ALL";
type FilterValue = string;

export default function AdminApplicationsPage() {
  const { t } = useTranslation();
  usePageTitle(t("admin.applications.title"));
  const toast = useToast();

  const [filter, setFilter] = useState<FilterValue>(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (
      s === ApplicationStatus.NEW ||
      s === ApplicationStatus.APPROVED_BY_ADMIN ||
      s === ApplicationStatus.REJECTED ||
      s === ApplicationStatus.HIRED
    ) {
      return s;
    }
    return ALL_FILTER;
  });

  // Job filter: multi-select (client-side). URL ?job=<id> seeds the array.
  const [jobFilter, setJobFilter] = useState<number[]>(() => {
    const val = new URLSearchParams(window.location.search).get("job");
    return val && !Number.isNaN(Number(val)) ? [Number(val)] : [];
  });
  // Candidate filter: still single, URL-driven (?candidate=<id>) — there's no
  // UI to pick more than one from the panel.
  const [filterCandidateId, setFilterCandidateId] = useState<number | undefined>(() => {
    const val = new URLSearchParams(window.location.search).get("candidate");
    return val && !Number.isNaN(Number(val)) ? Number(val) : undefined;
  });

  // Clean URL params on mount after reading them
  useEffect(() => {
    if (jobFilter.length > 0 || filterCandidateId != null) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetcher = useCallback(
    (cursor: string | null): Promise<CursorPage<ApplicationWithDetails>> => {
      const params: ApplicationListParams = { cursor };
      if (filter !== ALL_FILTER) params.status = filter as ApplicationStatus;
      if (filterCandidateId != null) params.candidate_id = filterCandidateId;
      return getApplications(params);
    },
    [filter, filterCandidateId],
  );

  const {
    items: applications,
    isLoading,
    isFetchingMore,
    error,
    sentinelRef,
    reload,
    updateItem,
    removeItem,
  } = useInfiniteList<ApplicationWithDetails>(fetcher);

  const [detail, setDetail] = useState<ApplicationWithDetails | null>(null);
  const [statusModal, setStatusModal] = useState<ApplicationWithDetails | null>(null);
  const [notesModal, setNotesModal] = useState<ApplicationWithDetails | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ApplicationWithDetails | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState(false);

  // Client-side filters (status + job/candidate are server-side via fetcher).
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [filterOpen, setFilterOpen] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<number[]>([]);

  // Cache of all jobs and active companies for the filter selects.
  const [allJobs, setAllJobs] = useState<{ id: number; title: string; company_id: number }[]>([]);
  const [companyNameById, setCompanyNameById] = useState<Map<number, string>>(
    new Map(),
  );
  const [jobTitleById, setJobTitleById] = useState<Map<number, string>>(
    new Map(),
  );
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      getJobs({ limit: 100 }, ctrl.signal),
      getActiveCompanies({ limit: 100 }, ctrl.signal),
    ])
      .then(([jobsPage, companiesPage]) => {
        setAllJobs(
          jobsPage.items.map((j) => ({
            id: j.id,
            title: j.title,
            company_id: j.company_id,
          })),
        );
        setJobTitleById(new Map(jobsPage.items.map((j) => [j.id, j.title])));
        setCompanyNameById(
          new Map(
            companiesPage.items.map((row) => [
              row.company_profile.id,
              row.company_profile.name,
            ]),
          ),
        );
      })
      .catch(() => {
        /* best-effort */
      });
    return () => ctrl.abort();
  }, []);

  const filteredApplications = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const jobSet = new Set(jobFilter);
    const companySet = new Set(companyFilter);
    return applications.filter((a) => {
      if (jobSet.size > 0 && !jobSet.has(a.job_id)) return false;
      if (companySet.size > 0 && !companySet.has(a.job.company_id)) return false;
      if (!q) return true;
      return [
        a.candidate.full_name,
        a.candidate.email,
        a.candidate.phone ?? "",
        a.job.title,
        a.job.location,
        a.admin_notes ?? "",
      ].some((s) => s.toLowerCase().includes(q));
    });
  }, [applications, debouncedQuery, jobFilter, companyFilter]);

  const activeFilterCount =
    (debouncedQuery.trim() ? 1 : 0) +
    (filter !== ALL_FILTER ? 1 : 0) +
    jobFilter.length +
    (filterCandidateId != null ? 1 : 0) +
    companyFilter.length;

  // Auto-open application passed via navigation state (e.g. from Candidate detail)
  useAutoOpenFromRouteState<ApplicationWithDetails>("autoOpen", setDetail);

  const STATUS_LABELS: Record<string, string> = {
    NEW: t("admin.applications.statusLabels.NEW"),
    APPROVED_BY_ADMIN: t("admin.applications.statusLabels.APPROVED_BY_ADMIN"),
    REJECTED: t("admin.applications.statusLabels.REJECTED"),
    HIRED: t("admin.applications.statusLabels.HIRED"),
  };

  async function handleDeleteConfirm() {
    if (!deleteCandidate) return;
    setPendingDelete(true);
    try {
      await deleteApplication(deleteCandidate.id);
      removeItem((a) => a.id === deleteCandidate.id);
      toast.success(t("admin.applications.deletedToast"));
      setDeleteCandidate(null);
      setDetail(null);
    } catch {
      toast.error(t("admin.applications.errors.deleteFailed"));
    } finally {
      setPendingDelete(false);
    }
  }

  return (
    <div>
      <h1 data-page-heading className="sr-only">
        {t("admin.applications.title")}
      </h1>
      <PageHeader
        eyebrow={t("admin.applications.title")}
        subtitle={t("admin.applications.subtitle")}
      />

      {/* Search + filter trigger */}
      <div className="mb-3 flex items-stretch gap-2">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("admin.applications.searchPlaceholder")}
            clearable
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          aria-expanded={filterOpen}
          aria-label={t("admin.applications.openFilters")}
          className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors duration-200 active:scale-95 ${
            filterOpen
              ? "border-copper/50 bg-copper/10 text-white"
              : "border-white/15 bg-card-raised/40 text-white/75 hover:border-copper/40 hover:text-white"
          }`}
        >
          <FunnelIcon />
          <span className="hidden sm:inline">{t("admin.applications.filters")}</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-copper text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {filter !== ALL_FILTER && (
            <ActiveFilterChip
              label={`${t("admin.applications.table.status")}: ${STATUS_LABELS[filter]}`}
              onRemove={() => setFilter(ALL_FILTER)}
            />
          )}
          {query.trim() && (
            <ActiveFilterChip
              label={`${t("common.search")}: "${query.trim()}"`}
              onRemove={() => setQuery("")}
            />
          )}
          {jobFilter.map((id) => (
            <ActiveFilterChip
              key={`job-${id}`}
              label={`${t("common.filteredByJob")}: ${jobTitleById.get(id) ?? `#${id}`}`}
              onRemove={() => setJobFilter((prev) => prev.filter((x) => x !== id))}
            />
          ))}
          {filterCandidateId != null && (
            <ActiveFilterChip
              label={`${t("common.filteredByCandidate")} #${filterCandidateId}`}
              onRemove={() => setFilterCandidateId(undefined)}
            />
          )}
          {companyFilter.map((id) => (
            <ActiveFilterChip
              key={`co-${id}`}
              label={`${t("admin.applications.filterByCompany")}: ${companyNameById.get(id) ?? `#${id}`}`}
              onRemove={() => setCompanyFilter((prev) => prev.filter((x) => x !== id))}
            />
          ))}
        </div>
      )}

      {/* Filter panel */}
      <ApplicationsFilterPanel
        filterOpen={filterOpen}
        filter={filter}
        setFilter={setFilter}
        companyFilter={companyFilter}
        setCompanyFilter={setCompanyFilter}
        jobFilter={jobFilter}
        setJobFilter={setJobFilter}
        allJobs={allJobs}
        companyNameById={companyNameById}
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
        <ErrorState message={t("admin.applications.loadError")} onRetry={reload} />
      ) : applications.length === 0 ? (
        <EmptyState
          eyebrow={t("admin.applications.title")}
          headline={t("admin.applications.empty")}
        />
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/40">
            {t("publicJobs.board.noResults")}
          </p>
        </div>
      ) : (
        <>
          <ApplicationsMobileList
            applications={filteredApplications}
            onOpenStatus={setStatusModal}
            onOpenNotes={setNotesModal}
            onOpenDelete={setDeleteCandidate}
          />

          <ApplicationsTable
            applications={filteredApplications}
            onOpenDetail={setDetail}
            onOpenStatus={setStatusModal}
            onOpenNotes={setNotesModal}
            onOpenDelete={setDeleteCandidate}
          />

          {/* Sentinel for IntersectionObserver */}
          <div ref={sentinelRef} />
          {isFetchingMore && (
            <p className="mt-4 text-center text-xs text-white/30">
              {t("common.loading")}
            </p>
          )}
        </>
      )}

      {/* Detail modal */}
      <DetailDialog
        app={detail}
        onClose={() => setDetail(null)}
        onUpdateStatus={() => {
          if (detail) setStatusModal(detail);
          setDetail(null);
        }}
        onEditNotes={() => {
          if (detail) setNotesModal(detail);
          setDetail(null);
        }}
        onDelete={() => {
          if (detail) setDeleteCandidate(detail);
          setDetail(null);
        }}
      />

      {/* Status update modal */}
      <ApplicationStatusDialog
        app={statusModal}
        onClose={() => setStatusModal(null)}
        onSaved={(updated) => {
          updateItem(
            (a) => a.id === updated.id,
            (prev) => ({
              ...prev,
              status: updated.status,
              admin_notes: updated.admin_notes,
              updated_at: updated.updated_at,
            }),
          );
          toast.success(t("admin.applications.savedToast"));
          setStatusModal(null);
        }}
        onError={() => toast.error(t("admin.applications.errors.updateFailed"))}
      />

      {/* Notes-only modal */}
      <ApplicationNotesDialog
        app={notesModal}
        onClose={() => setNotesModal(null)}
        onSaved={(updated) => {
          updateItem(
            (a) => a.id === updated.id,
            (prev) => ({
              ...prev,
              admin_notes: updated.admin_notes,
              updated_at: updated.updated_at,
            }),
          );
          toast.success(t("admin.applications.notesSavedToast"));
          setNotesModal(null);
        }}
        onError={() => toast.error(t("admin.applications.errors.notesFailed"))}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteCandidate != null}
        onOpenChange={(o) => !o && setDeleteCandidate(null)}
        title={t("admin.applications.deleteConfirmTitle")}
        message={t("admin.applications.deleteConfirm")}
        confirmLabel={t("admin.applications.deleteConfirmYes")}
        variant="danger"
        isPending={pendingDelete}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
