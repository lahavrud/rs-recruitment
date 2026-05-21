import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  approveCompany,
  getPendingCompanies,
  rejectCompany,
} from "@/services/adminCompanies";
import type { CompanyProfileRead, PendingCompanyRead } from "@/types/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import TableSkeleton from "@/components/ui/TableSkeleton";
import MobileListSkeleton from "@/components/admin/MobileListSkeleton";
import MobileEntityCard from "@/components/admin/MobileEntityCard";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { useInfiniteList, type CursorPage } from "@/hooks/useInfiniteList";
import { useToast } from "@/hooks/useToast";
import CompanyDetailDialog, { CompanyDetailBody } from "./CompanyDetailDialog";
import { formatDate } from "@/utils/formatDate";

export default function CompanyPendingTab({ query }: { query: string }) {
  const { t } = useTranslation();
  const toast = useToast();

  const fetcher = useCallback(
    (cursor: string | null): Promise<CursorPage<PendingCompanyRead>> =>
      getPendingCompanies({ cursor }),
    [],
  );

  const {
    items: companies,
    isLoading,
    isFetchingMore,
    error,
    sentinelRef,
    reload,
    removeItem,
  } = useInfiniteList<PendingCompanyRead>(fetcher);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((row) => {
      const p = row.company_profile;
      return [
        p.name,
        p.contact_first_name,
        p.contact_last_name,
        p.contact_mobile_phone,
        row.user.email,
      ].some((s) => s.toLowerCase().includes(q));
    });
  }, [companies, query]);

  const [rejectPending, setRejectPending] = useState<PendingCompanyRead | null>(null);
  const [pendingMutation, setPendingMutation] = useState(false);
  const [detail, setDetail] = useState<CompanyProfileRead | null>(null);

  async function handleApprove(row: PendingCompanyRead) {
    try {
      await approveCompany(row.user.id);
      removeItem((c) => c.user.id === row.user.id);
      toast.success(t("admin.companies.approvedToast"));
    } catch {
      toast.error(t("admin.companies.approveError"));
    }
  }

  async function handleRejectConfirm() {
    if (!rejectPending) return;
    setPendingMutation(true);
    try {
      await rejectCompany(rejectPending.user.id);
      removeItem((c) => c.user.id === rejectPending.user.id);
      toast.success(t("admin.companies.rejectedToast"));
      setRejectPending(null);
    } catch {
      toast.error(t("admin.companies.rejectError"));
    } finally {
      setPendingMutation(false);
    }
  }

  function renderRowActions(row: PendingCompanyRead) {
    return (
      <DropdownMenu
        ariaLabel={t("admin.companies.rowActionsLabel")}
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
        <DropdownMenuItem onSelect={() => setDetail(row.company_profile)}>
          {t("admin.companies.viewAction")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => window.open(`mailto:${row.user.email}`, "_self")}
        >
          {t("admin.companies.emailAction")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={() => setRejectPending(row)}>
          {t("admin.companies.rejectAction")}
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }

  return (
    <>
      {isLoading ? (
        <>
          <div className="md:hidden">
            <MobileListSkeleton rows={4} />
          </div>
          <div className="hidden md:block">
            <TableSkeleton rows={4} columns={3} />
          </div>
        </>
      ) : error ? (
        <ErrorState message={t("admin.companies.loadError")} onRetry={reload} />
      ) : companies.length === 0 ? (
        <EmptyState
          eyebrow={t("admin.companies.tabs.pending")}
          headline={t("admin.companies.empty")}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/40">
            {t("publicJobs.board.noResults")}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: collapsible cards with detail body inline */}
          <div className="space-y-2 md:hidden">
            {filtered.map((row) => (
              <MobileEntityCard
                key={row.user.id}
                title={
                  <span className="block truncate font-medium text-white/90">
                    {row.company_profile.name}
                  </span>
                }
                actions={renderRowActions(row)}
              >
                <CompanyDetailBody profile={row.company_profile} />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleApprove(row)}
                    className="flex-1 rounded-sm bg-success/15 px-4 py-2 text-sm font-medium text-success hover:bg-success/25"
                  >
                    {t("admin.companies.approveAction")}
                  </button>
                  <button
                    onClick={() => setRejectPending(row)}
                    className="flex-1 rounded-sm border border-danger/25 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
                  >
                    {t("admin.companies.rejectAction")}
                  </button>
                </div>
              </MobileEntityCard>
            ))}
          </div>

          {/* Desktop: card rows with inline approve + 3-dot menu */}
          <div className="hidden space-y-3 md:block">
            {filtered.map((row) => (
              <div
                key={row.user.id}
                onClick={() => setDetail(row.company_profile)}
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-white/8 bg-card p-4 transition hover:bg-card-raised sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="block truncate font-medium text-white/90">
                    {row.company_profile.name}
                  </span>
                  <p className="truncate text-xs text-white/45">{row.user.email}</p>
                  <p className="mt-1 text-xs text-white/35">
                    {t("admin.companies.contactLabel")}:{" "}
                    {row.company_profile.contact_first_name}{" "}
                    {row.company_profile.contact_last_name} ·{" "}
                    {t("admin.companies.registeredLabel")}{" "}
                    {formatDate(row.user.created_at)}
                  </p>
                </div>
                <div
                  className="flex shrink-0 items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleApprove(row)}
                    className="rounded-sm bg-success/15 px-4 py-1.5 text-sm font-medium text-success hover:bg-success/25"
                  >
                    {t("admin.companies.approveAction")}
                  </button>
                  {renderRowActions(row)}
                </div>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} />
          {isFetchingMore && (
            <p className="mt-4 text-center text-xs text-white/30">
              {t("common.loading")}
            </p>
          )}
        </>
      )}

      <CompanyDetailDialog
        profile={detail}
        onClose={() => setDetail(null)}
        onEdit={() => setDetail(null)}
        hideEditButton
      />

      <ConfirmDialog
        open={rejectPending != null}
        onOpenChange={(o) => !o && setRejectPending(null)}
        title={t("admin.companies.rejectConfirmTitle")}
        message={t("admin.companies.rejectConfirm")}
        confirmLabel={t("admin.companies.rejectAction")}
        variant="danger"
        isPending={pendingMutation}
        onConfirm={handleRejectConfirm}
      />
    </>
  );
}
