import { useTranslation } from "react-i18next";
import SearchableMultiSelect from "@/components/admin/SearchableMultiSelect";

export interface CandidatesFilterPanelProps {
  open: boolean;
  companyFilter: number[];
  setCompanyFilter: (next: number[]) => void;
  jobFilter: number[];
  setJobFilter: (next: number[]) => void;
  allJobs: { id: number; title: string; company_id: number }[];
  companyNameById: Map<number, string>;
}

export default function CandidatesFilterPanel({
  open,
  companyFilter,
  setCompanyFilter,
  jobFilter,
  setJobFilter,
  allJobs,
  companyNameById,
}: CandidatesFilterPanelProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`mb-4 grid transition-[grid-template-rows] duration-300 ease-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <div
          className={`grid grid-cols-1 gap-3 rounded-md border border-white/8 bg-card/40 p-4 transition-opacity duration-200 sm:grid-cols-2 ${
            open ? "opacity-100 delay-100" : "opacity-0"
          }`}
        >
          {/* Company first → in RTL it lands on the visual right */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-copper">
              {t("admin.candidates.filterByCompany")}
            </p>
            <SearchableMultiSelect<number>
              values={companyFilter}
              onChange={(next) => {
                setCompanyFilter(next);
                if (next.length > 0 && jobFilter.length > 0) {
                  const allowed = new Set(
                    allJobs
                      .filter((j) => next.includes(j.company_id))
                      .map((j) => j.id),
                  );
                  setJobFilter(jobFilter.filter((id) => allowed.has(id)));
                }
              }}
              options={Array.from(companyNameById.entries()).map(([id, name]) => ({
                value: id,
                label: name,
              }))}
              placeholder={t("admin.candidates.allCompanies")}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-copper">
              {t("admin.candidates.filterByJob")}
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
              placeholder={t("admin.candidates.allJobs")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
