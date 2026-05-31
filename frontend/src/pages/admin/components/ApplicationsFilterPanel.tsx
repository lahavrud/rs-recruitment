import { useTranslation } from "react-i18next";
import SearchableMultiSelect from "@/components/admin/SearchableMultiSelect";
import { ApplicationStatus } from "@/types/api";

const ALL_STATUSES = [
  ApplicationStatus.NEW,
  ApplicationStatus.APPROVED_BY_ADMIN,
  ApplicationStatus.REJECTED,
  ApplicationStatus.HIRED,
];

const ALL_FILTER = "ALL";
type FilterValue = string;

export interface ApplicationsFilterPanelProps {
  filterOpen: boolean;
  filter: FilterValue;
  setFilter: (value: FilterValue) => void;
  companyFilter: number[];
  setCompanyFilter: (next: number[]) => void;
  jobFilter: number[];
  setJobFilter: React.Dispatch<React.SetStateAction<number[]>>;
  allJobs: { id: number; title: string; company_id: number }[];
  companyNameById: Map<number, string>;
}

export function ApplicationsFilterPanel({
  filterOpen,
  filter,
  setFilter,
  companyFilter,
  setCompanyFilter,
  jobFilter,
  setJobFilter,
  allJobs,
  companyNameById,
}: ApplicationsFilterPanelProps) {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    NEW: t("admin.applications.statusLabels.NEW"),
    APPROVED_BY_ADMIN: t("admin.applications.statusLabels.APPROVED_BY_ADMIN"),
    REJECTED: t("admin.applications.statusLabels.REJECTED"),
    HIRED: t("admin.applications.statusLabels.HIRED"),
  };

  const filterTabs: FilterValue[] = [ALL_FILTER, ...ALL_STATUSES];

  function handleCompanyChange(next: number[]) {
    setCompanyFilter(next);
    // Drop any selected jobs that no longer match an active company.
    if (next.length > 0 && jobFilter.length > 0) {
      const allowed = new Set(
        allJobs
          .filter((j) => next.includes(j.company_id))
          .map((j) => j.id),
      );
      setJobFilter((prev) => prev.filter((id) => allowed.has(id)));
    }
  }

  return (
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
              {t("admin.applications.table.status")}
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
                      ? t("admin.applications.filterAll")
                      : STATUS_LABELS[tab]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Company first → in RTL it lands on the visual right */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-copper">
                {t("admin.applications.filterByCompany")}
              </p>
              <SearchableMultiSelect<number>
                values={companyFilter}
                onChange={handleCompanyChange}
                options={Array.from(companyNameById.entries()).map(([id, name]) => ({
                  value: id,
                  label: name,
                }))}
                placeholder={t("admin.applications.allCompanies")}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-copper">
                {t("admin.applications.filterByJob")}
              </p>
              <SearchableMultiSelect<number>
                values={jobFilter}
                onChange={setJobFilter}
                options={allJobs
                  .filter(
                    (j) =>
                      companyFilter.length === 0 ||
                      companyFilter.includes(j.company_id),
                  )
                  .map((j) => ({ value: j.id, label: j.title }))}
                placeholder={t("admin.applications.allJobs")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
