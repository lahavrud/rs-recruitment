import { useTranslation } from "react-i18next";
import type { JobRead } from "@/types/api";
import { JobStatus } from "@/types/api";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import FeaturedDesktopSash from "./FeaturedDesktopSash";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface JobsTableProps {
  jobs: JobRead[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  onView: (job: JobRead) => void;
  onEdit: (job: JobRead) => void;
  onMailTo: (job: JobRead) => void;
  onApprove: (job: JobRead) => void;
  onReject: (job: JobRead) => void;
  onDelete: (job: JobRead) => void;
}

export default function JobsTable({
  jobs,
  statusLabels,
  statusColors,
  onView,
  onEdit,
  onMailTo,
  onApprove,
  onReject,
  onDelete,
}: JobsTableProps) {
  const { t } = useTranslation();
  return (
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
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => onView(job)}
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
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[job.status]}`}
                >
                  {statusLabels[job.status]}
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
                  <DropdownMenuItem onSelect={() => onView(job)}>
                    {t("admin.jobs.viewAction")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(job)}>
                    {t("admin.jobs.editAction")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onMailTo(job)}>
                    {t("admin.jobs.email")}
                  </DropdownMenuItem>
                  {job.status === JobStatus.PENDING_APPROVAL && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onApprove(job)}>
                        {t("admin.jobs.approve")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="danger"
                        onSelect={() => onReject(job)}
                      >
                        {t("admin.jobs.reject")}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onSelect={() => onDelete(job)}
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
  );
}
