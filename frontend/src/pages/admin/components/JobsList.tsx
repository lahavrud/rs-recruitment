import { useTranslation } from "react-i18next";
import type { JobRead } from "@/types/api";
import { JobStatus } from "@/types/api";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import MobileJobCard from "./MobileJobCard";

export interface JobsListProps {
  jobs: JobRead[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  companyNameById: Map<number, string>;
  onEdit: (job: JobRead) => void;
  onMailTo: (job: JobRead) => void;
  onApprove: (job: JobRead) => void;
  onReject: (job: JobRead) => void;
  onDelete: (job: JobRead) => void;
}

export default function JobsList({
  jobs,
  statusLabels,
  statusColors,
  companyNameById,
  onEdit,
  onMailTo,
  onApprove,
  onReject,
  onDelete,
}: JobsListProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 md:hidden">
      {jobs.map((job) => (
        <MobileJobCard
          key={job.id}
          job={job}
          statusLabels={statusLabels}
          statusColors={statusColors}
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
          }
        />
      ))}
    </div>
  );
}
