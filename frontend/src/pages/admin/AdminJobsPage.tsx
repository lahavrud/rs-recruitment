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
import FunnelIcon from "@/components/admin/FunnelIcon";
import ActiveFilterChip from "@/components/admin/ActiveFilterChip";
import SearchInput from "@/components/ui/SearchInput";
import RangeSlider from "@/components/ui/RangeSlider";
import SearchableMultiSelect from "@/components/admin/SearchableMultiSelect";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { useInfiniteList, type CursorPage } from "@/hooks/useInfiniteList";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import JobDetailDialog, {
  FeaturedDesktopSash,
  MobileJobCard,
} from "./components/JobDetailDialog";
import JobEditDialog from "./components/JobEditDialog";
import JobCreateDialog from "./components/JobCreateDialog";
import { formatDate } from "@/utils/formatDate";

const ALL_STATUSES = [
  JobStatus.PENDING_APPROVAL,
  JobStatus.PUBLISHED,
  JobStatus.CLOSED,
];


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

  const filterTabs: FilterValue[] = [ALL_FILTER, ...ALL_STATUSES];

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

      {/* Search + filter trigger */}
      <div className="mb-3 flex items-stretch gap-2">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("admin.jobs.searchPlaceholder")}
            clearable
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          aria-expanded={filterOpen}
          aria-label={t("admin.jobs.openFilters")}
          className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors duration-200 active:scale-95 ${
            filterOpen
              ? "border-copper/50 bg-copper/10 text-white"
              : "border-white/15 bg-card-raised/40 text-white/75 hover:border-copper/40 hover:text-white"
          }`}
        >
          <FunnelIcon />
          <span className="hidden sm:inline">{t("admin.jobs.filters")}</span>
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
              label={`${t("admin.jobs.fields.status")}: ${STATUS_LABELS[filter]}`}
              onRemove={() => setFilter(ALL_FILTER)}
            />
          )}
          {query.trim() && (
            <ActiveFilterChip
              label={`${t("common.search")}: "${query.trim()}"`}
              onRemove={() => setQuery("")}
            />
          )}
          {selectedLocations.map((loc) => (
            <ActiveFilterChip
              key={`loc-${loc}`}
              label={`${t("publicJobs.board.locationLabel")}: ${loc}`}
              onRemove={() =>
                setSelectedLocations((prev) => prev.filter((x) => x !== loc))
              }
            />
          ))}
          {isSalaryActive && (
            <ActiveFilterChip
              label={`${t("publicJobs.board.salaryRange")}: ${effectiveSalaryRange[0].toLocaleString("he-IL")}–${effectiveSalaryRange[1].toLocaleString("he-IL")} ₪`}
              onRemove={() => setSalaryRange(null)}
            />
          )}
          {companyFilter.map((id) => (
            <ActiveFilterChip
              key={`co-${id}`}
              label={`${t("admin.jobs.fields.company")}: ${companyNameById.get(id) ?? `#${id}`}`}
              onRemove={() => setCompanyFilter((prev) => prev.filter((x) => x !== id))}
            />
          ))}
          {featuredOnly && (
            <ActiveFilterChip
              label={t("admin.jobs.featuredOnly")}
              onRemove={() => setFeaturedOnly(false)}
            />
          )}
        </div>
      )}

      {/* Filter panel — animated open/close via grid-rows 0fr→1fr */}
      <div
        className={`mb-4 grid transition-[grid-template-rows] duration-300 ease-out ${
          filterOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`space-y-4 rounded-md border border-white/8 bg-card/40 p-4 transition-opacity duration-200 ${
              filterOpen ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-copper">
              {t("admin.jobs.fields.status")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => {
                const active = filter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "bg-copper text-white"
                        : "border border-white/15 text-white/55 hover:border-white/30 hover:text-white/85"
                    }`}
                  >
                    {tab === ALL_FILTER
                      ? t("admin.jobs.filterAll")
                      : STATUS_LABELS[tab]}
                  </button>
                );
              })}
            </div>
          </div>
          {uniqueLocations.length >= 2 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-copper">
                {t("publicJobs.board.locationLabel")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedLocations([])}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    selectedLocations.length === 0
                      ? "bg-copper text-white"
                      : "border border-white/15 text-white/55 hover:border-white/30 hover:text-white/85"
                  }`}
                >
                  {t("publicJobs.board.allLocations")}
                </button>
                {uniqueLocations.map((loc) => {
                  const active = selectedLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() =>
                        setSelectedLocations((prev) =>
                          active
                            ? prev.filter((x) => x !== loc)
                            : [...prev, loc],
                        )
                      }
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-copper text-white"
                          : "border border-white/15 text-white/55 hover:border-white/30 hover:text-white/85"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-copper">
                {t("publicJobs.board.salaryRange")}
              </p>
              {isSalaryActive && (
                <button
                  type="button"
                  onClick={() =>
                    setSalaryRange([salaryBounds.min, salaryBounds.max])
                  }
                  className="text-[11px] text-copper/70 transition hover:text-copper"
                >
                  {t("publicJobs.board.resetSalary")}
                </button>
              )}
            </div>
            <RangeSlider
              min={salaryBounds.min}
              max={salaryBounds.max}
              step={500}
              value={effectiveSalaryRange}
              onChange={(next) => setSalaryRange(next)}
              formatValue={(n) => `${n.toLocaleString("he-IL")} ₪`}
              ariaLabelMin={t("publicJobs.board.salaryMinAria")}
              ariaLabelMax={t("publicJobs.board.salaryMaxAria")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-copper">
                {t("admin.jobs.fields.company")}
              </p>
              <SearchableMultiSelect<number>
                values={companyFilter}
                onChange={setCompanyFilter}
                options={uniqueCompanies.map((id) => ({
                  value: id,
                  label: companyNameById.get(id) ?? `#${id}`,
                }))}
                placeholder={t("admin.jobs.companyAll")}
              />
            </div>
            <label className="mt-auto inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={(e) => setFeaturedOnly(e.target.checked)}
                className="size-4 rounded border-white/20 bg-well text-copper focus:ring-copper"
              />
              {t("admin.jobs.featuredOnly")}
            </label>
          </div>
          </div>
        </div>
      </div>

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
          {/* Mobile cards — tap row to expand inline; 3-dot menu for actions */}
          <div className="space-y-2 md:hidden">
            {filteredJobs.map((job) => (
              <MobileJobCard
                key={job.id}
                job={job}
                statusLabels={STATUS_LABELS}
                statusColors={STATUS_COLORS}
                companyName={companyNameById.get(job.company_id)}
                actions={
                  <DropdownMenu
                    ariaLabel={t("admin.jobs.rowActionsLabel")}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/8 hover:text-white/85"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span aria-hidden>⋮</span>
                      </button>
                    }
                  >
                    <DropdownMenuItem onSelect={() => setEditing(job)}>
                      {t("admin.jobs.editAction")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openMailToCompany(job)}>
                      {t("admin.jobs.email")}
                    </DropdownMenuItem>
                    {job.status === JobStatus.PENDING_APPROVAL && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleApprove(job)}>
                          {t("admin.jobs.approve")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="danger"
                          onSelect={() => setRejectPending(job)}
                        >
                          {t("admin.jobs.reject")}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="danger"
                      onSelect={() => setDeletePending(job)}
                    >
                      {t("admin.jobs.deleteAction")}
                    </DropdownMenuItem>
                  </DropdownMenu>
                }
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/8 bg-card md:block">
            <table className="min-w-full divide-y divide-white/6 text-sm">
              <thead className="bg-well text-xs font-medium uppercase tracking-wide text-white/35">
                <tr>
                  <th className="px-4 py-3 text-start">
                    {t("admin.jobs.fields.title")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.jobs.fields.location")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("common.salary")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.jobs.fields.status")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.jobs.submittedLabel")}
                  </th>
                  <th className="px-4 py-3 text-end" aria-hidden />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => setDetail(job)}
                    className="cursor-pointer transition hover:bg-white/3"
                  >
                    <td className="relative px-4 py-3 font-medium text-white/85">
                      {job.is_featured && <FeaturedDesktopSash />}
                      <span>{job.title}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{job.location}</td>
                    <td className="px-4 py-3 text-sm text-copper/70">
                      {job.salary_min != null && job.salary_max != null
                        ? `${job.salary_min.toLocaleString("he-IL")}–${job.salary_max.toLocaleString("he-IL")} ₪`
                        : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}
                      >
                        {STATUS_LABELS[job.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {formatDate(job.created_at)}
                    </td>
                    <td
                      className="px-4 py-3 text-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu
                        ariaLabel={t("admin.jobs.rowActionsLabel")}
                        trigger={
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/8 hover:text-white/80"
                          >
                            <span aria-hidden>⋮</span>
                          </button>
                        }
                      >
                        <DropdownMenuItem onSelect={() => setDetail(job)}>
                          {t("admin.jobs.viewAction")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEditing(job)}>
                          {t("admin.jobs.editAction")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openMailToCompany(job)}>
                          {t("admin.jobs.email")}
                        </DropdownMenuItem>
                        {job.status === JobStatus.PENDING_APPROVAL && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleApprove(job)}>
                              {t("admin.jobs.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="danger"
                              onSelect={() => setRejectPending(job)}
                            >
                              {t("admin.jobs.reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="danger"
                          onSelect={() => setDeletePending(job)}
                        >
                          {t("admin.jobs.deleteAction")}
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div ref={sentinelRef} />
          {isFetchingMore && (
            <p className="mt-4 text-center text-xs text-white/30">
              {t("common.loading")}
            </p>
          )}
        </>
      )}

      <JobDetailDialog
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

      <JobEditDialog
        job={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          updateItem((j) => j.id === updated.id, updated);
          toast.success(t("admin.jobs.savedToast"));
          setEditing(null);
        }}
        onError={() => toast.error(t("admin.jobs.errors.saveFailed"))}
      />

      <JobCreateDialog
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

