import { useTranslation } from "react-i18next";
import MobileEntityCard from "@/components/admin/MobileEntityCard";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import type { ApplicationWithDetails } from "@/types/api";
import { ApplicationDetailBody } from "./ApplicationDetailDialog";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-copper/10 text-copper",
  APPROVED_BY_ADMIN: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  HIRED: "bg-hired/10 text-hired",
};

export interface ApplicationsMobileListProps {
  applications: ApplicationWithDetails[];
  onOpenStatus: (app: ApplicationWithDetails) => void;
  onOpenNotes: (app: ApplicationWithDetails) => void;
  onOpenDelete: (app: ApplicationWithDetails) => void;
}

export function ApplicationsMobileList({
  applications,
  onOpenStatus,
  onOpenNotes,
  onOpenDelete,
}: ApplicationsMobileListProps) {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    NEW: t("admin.applications.statusLabels.NEW"),
    APPROVED_BY_ADMIN: t("admin.applications.statusLabels.APPROVED_BY_ADMIN"),
    REJECTED: t("admin.applications.statusLabels.REJECTED"),
    HIRED: t("admin.applications.statusLabels.HIRED"),
  };

  return (
    <div className="space-y-2 md:hidden">
      {applications.map((app) => {
        const actions = (
          <DropdownMenu
            ariaLabel={t("admin.applications.rowActionsLabel")}
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
            <DropdownMenuItem onSelect={() => onOpenStatus(app)}>
              {t("admin.applications.updateStatusAction")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenNotes(app)}>
              {t("admin.applications.editNotesAction")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="danger"
              onSelect={() => onOpenDelete(app)}
            >
              {t("admin.applications.deleteAction")}
            </DropdownMenuItem>
          </DropdownMenu>
        );
        return (
          <MobileEntityCard
            key={app.id}
            title={
              <div className="min-w-0">
                <p className="truncate font-medium text-white/85">
                  {app.candidate.full_name}
                </p>
                <p className="truncate text-[11px] font-normal text-white/50">
                  {app.job.title}
                </p>
              </div>
            }
            badge={
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[app.status]}`}
              >
                {STATUS_LABELS[app.status]}
              </span>
            }
            actions={actions}
          >
            <ApplicationDetailBody app={app} />
          </MobileEntityCard>
        );
      })}
    </div>
  );
}
