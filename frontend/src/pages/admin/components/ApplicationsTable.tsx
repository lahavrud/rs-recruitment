import { useTranslation } from "react-i18next";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import type { ApplicationWithDetails } from "@/types/api";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-copper/10 text-copper",
  APPROVED_BY_ADMIN: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  HIRED: "bg-hired/10 text-hired",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface ApplicationsTableProps {
  applications: ApplicationWithDetails[];
  onOpenDetail: (app: ApplicationWithDetails) => void;
  onOpenStatus: (app: ApplicationWithDetails) => void;
  onOpenNotes: (app: ApplicationWithDetails) => void;
  onOpenDelete: (app: ApplicationWithDetails) => void;
}

export function ApplicationsTable({
  applications,
  onOpenDetail,
  onOpenStatus,
  onOpenNotes,
  onOpenDelete,
}: ApplicationsTableProps) {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    NEW: t("admin.applications.statusLabels.NEW"),
    APPROVED_BY_ADMIN: t("admin.applications.statusLabels.APPROVED_BY_ADMIN"),
    REJECTED: t("admin.applications.statusLabels.REJECTED"),
    HIRED: t("admin.applications.statusLabels.HIRED"),
  };

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-white/8 bg-card md:block">
      <table className="min-w-full divide-y divide-white/6 text-sm">
        <thead className="bg-well text-xs font-medium uppercase tracking-wide text-white/35">
          <tr>
            <th className="px-4 py-3 text-start">
              {t("admin.applications.table.candidate")}
            </th>
            <th className="px-4 py-3 text-start">
              {t("admin.applications.table.job")}
            </th>
            <th className="px-4 py-3 text-start">
              {t("admin.applications.table.status")}
            </th>
            <th className="px-4 py-3 text-start">
              {t("admin.applications.table.date")}
            </th>
            <th className="px-4 py-3 text-end" aria-hidden />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {applications.map((app) => (
            <tr
              key={app.id}
              onClick={() => onOpenDetail(app)}
              className="cursor-pointer transition hover:bg-white/3"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-white/85">
                  {app.candidate.full_name}
                </p>
                <p className="text-xs text-white/40">{app.candidate.email}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-white/80">{app.job.title}</p>
                <p className="text-xs text-white/40">{app.job.location}</p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}
                >
                  {STATUS_LABELS[app.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-white/40">
                {formatDate(app.created_at)}
              </td>
              <td
                className="px-4 py-3 text-end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu
                  ariaLabel={t("admin.applications.rowActionsLabel")}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/8 hover:text-white/80"
                    >
                      <span aria-hidden>⋮</span>
                    </button>
                  }
                >
                  <DropdownMenuItem onSelect={() => onOpenDetail(app)}>
                    {t("admin.applications.viewAction")}
                  </DropdownMenuItem>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
