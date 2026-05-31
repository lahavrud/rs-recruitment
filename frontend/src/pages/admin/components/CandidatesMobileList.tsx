import { useTranslation } from "react-i18next";
import type { CandidateProfileRead } from "@/types/api";
import MobileEntityCard from "@/components/admin/MobileEntityCard";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { CandidateDetailBody } from "./CandidateDetailDialog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface CandidatesMobileListProps {
  candidates: CandidateProfileRead[];
  onEdit: (c: CandidateProfileRead) => void;
  onDelete: (c: CandidateProfileRead) => void;
}

export default function CandidatesMobileList({
  candidates,
  onEdit,
  onDelete,
}: CandidatesMobileListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2 md:hidden">
      {candidates.map((c) => {
        const actions = (
          <DropdownMenu
            ariaLabel={t("admin.candidates.rowActionsLabel")}
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
            <DropdownMenuItem onSelect={() => onEdit(c)}>
              {t("admin.candidates.editAction")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                window.open(
                  `mailto:${c.email}?subject=${encodeURIComponent(
                    t("admin.candidates.emailSubject", { name: c.full_name }),
                  )}`,
                  "_self",
                )
              }
            >
              {t("admin.candidates.emailAction")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="danger"
              onSelect={() => onDelete(c)}
            >
              {t("admin.candidates.deleteAction")}
            </DropdownMenuItem>
          </DropdownMenu>
        );
        return (
          <MobileEntityCard
            key={c.id}
            title={<span className="truncate text-white/85">{c.full_name}</span>}
            badge={
              <span className="text-[11px] text-white/40">
                {formatDate(c.created_at)}
              </span>
            }
            actions={actions}
          >
            <CandidateDetailBody candidate={c} />
          </MobileEntityCard>
        );
      })}
    </div>
  );
}
