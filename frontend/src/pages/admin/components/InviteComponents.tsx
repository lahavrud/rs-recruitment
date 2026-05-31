import { useTranslation } from "react-i18next";
import type { InviteTokenRead } from "@/types/api";
import { InviteTokenStatus } from "@/types/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InviteDetailBody({ invite }: { invite: InviteTokenRead }) {
  const { t } = useTranslation();
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
      <dt className="text-white/35">
        {t("admin.companies.inviteList.columnStatus")}
      </dt>
      <dd>
        <InviteStatusBadge status={invite.status} />
      </dd>
      <dt className="text-white/35">
        {t("admin.companies.inviteList.columnCreated")}
      </dt>
      <dd className="text-white/70">{formatDate(invite.created_at)}</dd>
      <dt className="text-white/35">
        {t("admin.companies.inviteList.columnExpires")}
      </dt>
      <dd className="text-white/70">{formatDate(invite.expires_at)}</dd>
    </dl>
  );
}

export function InviteStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls =
    status === InviteTokenStatus.PENDING
      ? "bg-warning/10 text-warning"
      : status === InviteTokenStatus.USED
        ? "bg-success/10 text-success"
        : status === InviteTokenStatus.EXPIRED
          ? "bg-white/8 text-white/40"
          : "bg-danger/10 text-danger";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {t(`admin.companies.inviteStatusLabels.${status}`)}
    </span>
  );
}
