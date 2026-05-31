import { useTranslation } from "react-i18next";
import RangeSlider from "@/components/ui/RangeSlider";
import SearchInput from "@/components/ui/SearchInput";
import SearchableMultiSelect from "@/components/admin/SearchableMultiSelect";
import { JobStatus } from "@/types/api";
import ActiveFilterChip from "./ActiveFilterChip";

const ALL_FILTER = "ALL";
const ALL_STATUSES = [
  JobStatus.PENDING_APPROVAL,
  JobStatus.PUBLISHED,
  JobStatus.CLOSED,
];

function FunnelIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="size-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4Zm2 4a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 8Zm2 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 12Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export interface JobsFilterPanelProps {
  // search
  query: string;
  onQueryChange: (q: string) => void;
  // filter panel open/close
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  activeFilterCount: number;
  // status filter (server-side)
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  statusLabels: Record<string, string>;
  // location filter
  uniqueLocations: string[];
  selectedLocations: string[];
  onSelectedLocationsChange: (locs: string[]) => void;
  // salary filter
  salaryBounds: { min: number; max: number };
  effectiveSalaryRange: [number, number];
  isSalaryActive: boolean;
  onSalaryRangeChange: (range: [number, number] | null) => void;
  // company filter
  uniqueCompanies: number[];
  companyFilter: number[];
  onCompanyFilterChange: (ids: number[]) => void;
  companyNameById: Map<number, string>;
  // featured
  featuredOnly: boolean;
  onFeaturedOnlyChange: (v: boolean) => void;
}

export default function JobsFilterPanel({
  query,
  onQueryChange,
  filterOpen,
  onFilterOpenChange,
  activeFilterCount,
  statusFilter,
  onStatusFilterChange,
  statusLabels,
  uniqueLocations,
  selectedLocations,
  onSelectedLocationsChange,
  salaryBounds,
  effectiveSalaryRange,
  isSalaryActive,
  onSalaryRangeChange,
  uniqueCompanies,
  companyFilter,
  onCompanyFilterChange,
  companyNameById,
  featuredOnly,
  onFeaturedOnlyChange,
}: JobsFilterPanelProps) {
  const { t } = useTranslation();
  const filterTabs = [ALL_FILTER, ...ALL_STATUSES];

  return (
    <>
      {/* Search + filter trigger */}
      <div className="mb-3 flex items-stretch gap-2">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={onQueryChange}
            placeholder={t("admin.jobs.searchPlaceholder")}
            clearable
          />
        </div>
        <button
          type="button"
          onClick={() => onFilterOpenChange(!filterOpen)}
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
          {statusFilter !== ALL_FILTER && (
            <ActiveFilterChip
              label={`${t("admin.jobs.fields.status")}: ${statusLabels[statusFilter]}`}
              onRemove={() => onStatusFilterChange(ALL_FILTER)}
            />
          )}
          {query.trim() && (
            <ActiveFilterChip
              label={`${t("common.search")}: "${query.trim()}"`}
              onRemove={() => onQueryChange("")}
            />
          )}
          {selectedLocations.map((loc) => (
            <ActiveFilterChip
              key={`loc-${loc}`}
              label={`${t("publicJobs.board.locationLabel")}: ${loc}`}
              onRemove={() =>
                onSelectedLocationsChange(selectedLocations.filter((x) => x !== loc))
              }
            />
          ))}
          {isSalaryActive && (
            <ActiveFilterChip
              label={`${t("publicJobs.board.salaryRange")}: ${effectiveSalaryRange[0].toLocaleString("he-IL")}–${effectiveSalaryRange[1].toLocaleString("he-IL")} ₪`}
              onRemove={() => onSalaryRangeChange(null)}
            />
          )}
          {companyFilter.map((id) => (
            <ActiveFilterChip
              key={`co-${id}`}
              label={`${t("admin.jobs.fields.company")}: ${companyNameById.get(id) ?? `#${id}`}`}
              onRemove={() => onCompanyFilterChange(companyFilter.filter((x) => x !== id))}
            />
          ))}
          {featuredOnly && (
            <ActiveFilterChip
              label={t("admin.jobs.featuredOnly")}
              onRemove={() => onFeaturedOnlyChange(false)}
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
                  const active = statusFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => onStatusFilterChange(tab)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-copper text-white"
                          : "border border-white/15 text-white/55 hover:border-white/30 hover:text-white/85"
                      }`}
                    >
                      {tab === ALL_FILTER
                        ? t("admin.jobs.filterAll")
                        : statusLabels[tab]}
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
                    onClick={() => onSelectedLocationsChange([])}
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
                          onSelectedLocationsChange(
                            active
                              ? selectedLocations.filter((x) => x !== loc)
                              : [...selectedLocations, loc],
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
                    onClick={() => onSalaryRangeChange([salaryBounds.min, salaryBounds.max])}
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
                onChange={(next) => onSalaryRangeChange(next)}
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
                  onChange={onCompanyFilterChange}
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
                  onChange={(e) => onFeaturedOnlyChange(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-well text-copper focus:ring-copper"
                />
                {t("admin.jobs.featuredOnly")}
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
