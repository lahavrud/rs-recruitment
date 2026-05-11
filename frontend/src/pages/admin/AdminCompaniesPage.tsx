import axios from "axios";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  adminCreateCompany,
  approveCompany,
  createInvite,
  deleteCompany,
  deleteOrphanCompany,
  getActiveCompanies,
  getCompanyProfile,
  getInvites,
  getJobs,
  getPendingCompanies,
  rejectCompany,
  resendInvite,
  revokeInvite,
  updateCompanyProfile,
} from "@/services/admin";
import type {
  ActiveCompanyRead,
  CompanyProfileAdminCreate,
  CompanyProfileAdminUpdate,
  CompanyProfileRead,
  InviteTokenCreate,
  InviteTokenRead,
  JobRead,
  PendingCompanyRead,
} from "@/types/api";
import { InviteTokenStatus } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import TableSkeleton from "@/components/ui/TableSkeleton";
import MobileListSkeleton from "@/components/admin/MobileListSkeleton";
import SearchInput from "@/components/ui/SearchInput";
import ActiveFilterChip from "@/components/admin/ActiveFilterChip";
import MobileEntityCard from "@/components/admin/MobileEntityCard";
import DropdownMenu, {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { useInfiniteList, type CursorPage } from "@/hooks/useInfiniteList";
import { focusFirstError } from "@/utils/focusFirstError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { inputCls } from "@/styles/forms";

type Tab = "active" | "pending" | "invites";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const COMPANY_ID_RE = /^\d{9}$/;
const MOBILE_RE = /^05[0-9]\d{7}$/;

const CREATE_COMPANY_FIELD_ORDER = [
  "name",
  "company_id",
  "address",
  "contact_first_name",
  "contact_last_name",
  "contact_mobile_phone",
] as const;

// ── Page ────────────────────────────────────────────────────────────────────

export default function AdminCompaniesPage() {
  const { t } = useTranslation();
  usePageTitle(t("admin.companies.title"));
  const toast = useToast();
  const [view, setView] = useState<Tab>(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "active" || v === "pending" || v === "invites") return v;
    return "active";
  });
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(() => {
    return new URLSearchParams(window.location.search).get("action") === "invite";
  });
  const [externalDetail, setExternalDetail] = useState<CompanyProfileRead | null>(null);

  // Auto-open company detail when navigated from another page via ?detail=<profile_id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("detail");
    if (!id || Number.isNaN(Number(id))) return;
    const ctrl = new AbortController();
    window.history.replaceState({}, "", window.location.pathname);
    getCompanyProfile(Number(id), ctrl.signal)
      .then((profile) => {
        setView("active");
        setExternalDetail(profile);
      })
      .catch((e) => {
        if (axios.isCancel(e)) return;
        toast.error(t("common.genericError"));
      });
    return () => ctrl.abort();
  }, [t, toast]);

  // Strip the bootstrap `?action=` and `?view=` params after they've been
  // consumed so a hard refresh doesn't re-trigger them.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("action") || url.searchParams.has("view")) {
      url.searchParams.delete("action");
      url.searchParams.delete("view");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  function handleInvite() {
    setView("invites");
    setInviting(true);
  }

  // View counts shown in the segmented pills. First-page fetches; capped
  // counts surface as "N+".
  type ViewCount = { n: number; capped: boolean } | null;
  const [pendingCount, setPendingCount] = useState<ViewCount>(null);
  const [activeCount, setActiveCount] = useState<ViewCount>(null);
  const [invitesCount, setInvitesCount] = useState<ViewCount>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    function toCount<T>(p: { items: T[]; next_cursor: string | null }): ViewCount {
      return { n: p.items.length, capped: p.next_cursor != null };
    }
    getPendingCompanies({ limit: 100 }, ctrl.signal)
      .then((p) => setPendingCount(toCount(p)))
      .catch(() => {});
    getActiveCompanies({ limit: 100 }, ctrl.signal)
      .then((p) => setActiveCount(toCount(p)))
      .catch(() => {});
    getInvites(
      { status: InviteTokenStatus.PENDING, limit: 100 },
      ctrl.signal,
    )
      .then((p) => setInvitesCount(toCount(p)))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  function formatCount(c: ViewCount): string {
    if (c == null) return "—";
    return c.capped ? `${c.n}+` : String(c.n);
  }

  const viewCounts: Record<Tab, ViewCount> = {
    pending: pendingCount,
    active: activeCount,
    invites: invitesCount,
  };


  return (
    <div>
      <h1 data-page-heading className="sr-only">
        {t("admin.companies.title")}
      </h1>
      <PageHeader
        eyebrow={t("admin.companies.title")}
        subtitle={t("admin.companies.subtitle")}
        action={
          <div className="flex w-full gap-2 sm:w-auto sm:items-center">
            <button
              onClick={() => setCreating(true)}
              className="flex-1 rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold sm:flex-initial"
            >
              {t("admin.companies.newCompany")}
            </button>
            <button
              onClick={handleInvite}
              className="flex-1 rounded-sm border border-copper/40 px-4 py-2 text-sm font-medium text-copper/80 transition hover:border-copper hover:text-copper sm:flex-initial"
            >
              {t("admin.companies.inviteForm.newInviteButton")}
            </button>
          </div>
        }
      />

      {/* View pills — primary axis of the page, with live counts.
          On mobile, the active-companies pill sits on its own row above
          the other two; on `sm+` all three share a single centered row. */}
      <div className="mb-4 flex flex-wrap justify-center gap-1.5">
        {(["active", "pending", "invites"] as Tab[]).map((key, i) => {
          const active = view === key;
          const c = viewCounts[key];
          return (
            <Fragment key={key}>
              <button
                type="button"
                onClick={() => setView(key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97] ${
                  active
                    ? "bg-copper text-white shadow-sm shadow-black/30"
                    : "border border-white/12 text-white/60 hover:border-white/30 hover:text-white/85"
                }`}
              >
                <span>{t(`admin.companies.tabs.${key}`)}</span>
                <span
                  className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-white/8 text-white/55"
                  }`}
                >
                  {formatCount(c)}
                </span>
              </button>
              {/* Mobile-only flex-wrap break after the first pill. */}
              {i === 0 && (
                <div className="basis-full sm:hidden" aria-hidden="true" />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("admin.companies.searchPlaceholder")}
          clearable
        />
      </div>

      {query.trim() && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ActiveFilterChip
            label={`${t("common.search")}: "${query.trim()}"`}
            onRemove={() => setQuery("")}
          />
        </div>
      )}

      {view === "active" && (
        <ActiveTab
          query={query}
          externalDetail={externalDetail}
          onExternalDetailClose={() => setExternalDetail(null)}
        />
      )}
      {view === "pending" && <PendingTab query={query} />}
      {view === "invites" && (
        <InvitesTab
          query={query}
          externalOpen={inviting}
          onExternalClose={() => setInviting(false)}
        />
      )}

      <CreateCompanyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(profile) => {
          setCreating(false);
          setView("active");
          setExternalDetail(profile);
        }}
      />
    </div>
  );
}

// ── Active tab ─────────────────────────────────────────────────────────────

interface ActiveTabProps {
  query: string;
  externalDetail?: CompanyProfileRead | null;
  onExternalDetailClose?: () => void;
}

function ActiveTab({ query, externalDetail, onExternalDetailClose }: ActiveTabProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const fetcher = useCallback(
    (cursor: string | null): Promise<CursorPage<ActiveCompanyRead>> =>
      getActiveCompanies({ cursor }),
    [],
  );

  const {
    items: companies,
    isLoading,
    isFetchingMore,
    error,
    sentinelRef,
    reload,
    updateItem,
    removeItem,
  } = useInfiniteList<ActiveCompanyRead>(fetcher);

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((row) => {
      const p = row.company_profile;
      const u = row.user;
      return [
        p.name,
        p.contact_first_name,
        p.contact_last_name,
        p.contact_mobile_phone,
        p.contact_landline_phone ?? "",
        u?.email ?? "",
      ]
        .some((s) => s.toLowerCase().includes(q));
    });
  }, [companies, query]);

  const [detail, setDetail] = useState<CompanyProfileRead | null>(null);
  const [editing, setEditing] = useState<CompanyProfileRead | null>(null);
  const [deletePending, setDeletePending] = useState<ActiveCompanyRead | null>(null);
  const [pendingMutation, setPendingMutation] = useState(false);

  useEffect(() => {
    if (externalDetail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(externalDetail);
      onExternalDetailClose?.();
    }
  }, [externalDetail, onExternalDetailClose]);

  async function handleDelete() {
    if (!deletePending) return;
    setPendingMutation(true);
    try {
      if (deletePending.user) {
        await deleteCompany(deletePending.user.id);
      } else {
        await deleteOrphanCompany(deletePending.company_profile.id);
      }
      removeItem((c) => c.company_profile.id === deletePending.company_profile.id);
      toast.success(t("admin.companies.deletedToast"));
      setDeletePending(null);
    } catch {
      toast.error(t("admin.companies.active.deleteError"));
    } finally {
      setPendingMutation(false);
    }
  }

  return (
    <>
      {isLoading ? (
        <>
          <div className="md:hidden">
            <MobileListSkeleton rows={5} />
          </div>
          <div className="hidden md:block">
            <TableSkeleton rows={5} columns={3} />
          </div>
        </>
      ) : error ? (
        <ErrorState message={t("admin.companies.active.loadError")} onRetry={reload} />
      ) : companies.length === 0 ? (
        <EmptyState
          eyebrow={t("admin.companies.tabs.active")}
          headline={t("admin.companies.active.empty")}
        />
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/40">
            {t("publicJobs.board.noResults")}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards — tap to expand inline; 3-dot menu for actions */}
          <div className="space-y-2 md:hidden">
            {filteredCompanies.map((row) => {
              const actions = (
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
                  <DropdownMenuItem onSelect={() => setEditing(row.company_profile)}>
                    {t("admin.companies.editAction")}
                  </DropdownMenuItem>
                  {row.user?.email && (
                    <DropdownMenuItem
                      onSelect={() =>
                        window.open(`mailto:${row.user!.email}`, "_self")
                      }
                    >
                      {t("admin.companies.emailAction")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onSelect={() => setDeletePending(row)}
                  >
                    {t("admin.companies.deleteAction")}
                  </DropdownMenuItem>
                </DropdownMenu>
              );
              return (
                <MobileEntityCard
                  key={row.company_profile.id}
                  title={
                    <span className="font-medium text-white/90">
                      {row.company_profile.name}
                    </span>
                  }
                  actions={actions}
                >
                  <CompanyDetailBody
                    profile={row.company_profile}
                    user={row.user}
                  />
                </MobileEntityCard>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-white/8 bg-card md:block">
            <table className="min-w-full divide-y divide-white/6 text-sm">
              <thead className="bg-well text-xs font-medium uppercase tracking-wide text-white/35">
                <tr>
                  <th className="px-4 py-3 text-start">
                    {t("admin.companies.active.table.company")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.companies.active.table.contact")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.companies.active.table.joined")}
                  </th>
                  <th className="px-4 py-3 text-end" aria-hidden />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredCompanies.map((row) => (
                  <tr
                    key={row.company_profile.id}
                    onClick={() => setDetail(row.company_profile)}
                    className="cursor-pointer transition hover:bg-white/3"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-white/90">
                        {row.company_profile.name}
                      </span>
                      <p className="text-xs text-white/40">
                        {row.user?.email ?? t("admin.companies.noUserAccount")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {row.company_profile.contact_first_name}{" "}
                      {row.company_profile.contact_last_name}
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {formatDate(
                        row.user?.created_at ?? row.company_profile.created_at,
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu
                        ariaLabel={t("admin.companies.rowActionsLabel")}
                        trigger={
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/8 hover:text-white/80"
                          >
                            <span aria-hidden>⋮</span>
                          </button>
                        }
                      >
                        <DropdownMenuItem
                          onSelect={() => setDetail(row.company_profile)}
                        >
                          {t("admin.companies.viewAction")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setEditing(row.company_profile)}
                        >
                          {t("admin.companies.editAction")}
                        </DropdownMenuItem>
                        {row.user?.email && (
                          <DropdownMenuItem
                            onSelect={() =>
                              window.open(`mailto:${row.user!.email}`, "_self")
                            }
                          >
                            {t("admin.companies.emailAction")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="danger"
                          onSelect={() => setDeletePending(row)}
                        >
                          {t("admin.companies.deleteAction")}
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        onEdit={() => {
          if (detail) setEditing(detail);
          setDetail(null);
        }}
      />

      <EditCompanyDialog
        profile={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          updateItem(
            (c) => c.company_profile.id === updated.id,
            (() => {
              const target = companies.find((c) => c.company_profile.id === updated.id);
              return {
                user: target?.user ?? null,
                company_profile: updated,
              } as ActiveCompanyRead;
            })(),
          );
          toast.success(t("admin.companies.savedToast"));
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={deletePending != null}
        onOpenChange={(o) => !o && setDeletePending(null)}
        title={t("admin.companies.deleteConfirmTitle")}
        message={t("admin.companies.active.deleteConfirm")}
        confirmLabel={t("admin.companies.deleteAction")}
        variant="danger"
        isPending={pendingMutation}
        onConfirm={handleDelete}
      />
    </>
  );
}

// ── Pending tab ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PendingTab({ query: _query }: { query: string }) {
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

  const [rejectPending, setRejectPending] = useState<PendingCompanyRead | null>(null);
  const [pendingMutation, setPendingMutation] = useState(false);

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
      ) : (
        <>
          <div className="space-y-3">
            {companies.map((row) => (
              <div
                key={row.user.id}
                className="flex flex-col gap-3 rounded-xl border border-white/8 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="font-medium text-white/90">
                    {row.company_profile.name}
                  </span>
                  <p className="text-xs text-white/45">{row.user.email}</p>
                  <p className="mt-1 text-xs text-white/35">
                    {t("admin.companies.contactLabel")}:{" "}
                    {row.company_profile.contact_first_name}{" "}
                    {row.company_profile.contact_last_name} ·{" "}
                    {t("admin.companies.registeredLabel")}{" "}
                    {formatDate(row.user.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(row)}
                    className="rounded-sm bg-success/15 px-4 py-1.5 text-sm font-medium text-success hover:bg-success/25"
                  >
                    {t("admin.companies.approveAction")}
                  </button>
                  <button
                    onClick={() => setRejectPending(row)}
                    className="rounded-sm border border-danger/25 px-4 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
                  >
                    {t("admin.companies.rejectAction")}
                  </button>
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

// ── Invites tab ────────────────────────────────────────────────────────────

interface InvitesTabProps {
  query: string;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function InvitesTab({ query: _query, externalOpen, onExternalClose }: InvitesTabProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const fetcher = useCallback(
    (cursor: string | null): Promise<CursorPage<InviteTokenRead>> =>
      getInvites({ cursor }),
    [],
  );

  const {
    items: invites,
    isLoading,
    isFetchingMore,
    error,
    sentinelRef,
    reload,
    prependItem,
    updateItem,
  } = useInfiniteList<InviteTokenRead>(fetcher);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [revokePending, setRevokePending] = useState<InviteTokenRead | null>(null);
  const [pendingMutation, setPendingMutation] = useState(false);

  useEffect(() => {
    if (externalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowInviteForm(true);
      onExternalClose?.();
    }
  }, [externalOpen, onExternalClose]);

  async function handleRevokeConfirm() {
    if (!revokePending) return;
    setPendingMutation(true);
    try {
      await revokeInvite(revokePending.id);
      updateItem((i) => i.id === revokePending.id, {
        ...revokePending,
        status: InviteTokenStatus.REVOKED,
      });
      toast.success(t("admin.companies.revokedToast"));
      setRevokePending(null);
    } catch {
      toast.error(t("admin.companies.inviteList.revokeError"));
    } finally {
      setPendingMutation(false);
    }
  }

  async function handleResend(invite: InviteTokenRead) {
    try {
      await resendInvite(invite.id);
      toast.success(t("admin.companies.resentToast"));
    } catch {
      toast.error(t("admin.companies.inviteList.resendError"));
    }
  }

  return (
    <>
      {isLoading ? (
        <>
          <div className="md:hidden">
            <MobileListSkeleton rows={5} />
          </div>
          <div className="hidden md:block">
            <TableSkeleton rows={5} columns={4} />
          </div>
        </>
      ) : error ? (
        <ErrorState
          message={t("admin.companies.inviteList.loadError")}
          onRetry={reload}
        />
      ) : invites.length === 0 ? (
        <EmptyState
          eyebrow={t("admin.companies.tabs.invites")}
          headline={t("admin.companies.inviteList.empty")}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/8 bg-card">
            <table className="min-w-full divide-y divide-white/6 text-sm">
              <thead className="bg-well text-xs font-medium uppercase tracking-wide text-white/35">
                <tr>
                  <th className="px-4 py-3 text-start">
                    {t("admin.companies.inviteList.columnEmail")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.companies.inviteList.columnStatus")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.companies.inviteList.columnCreated")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("admin.companies.inviteList.columnExpires")}
                  </th>
                  <th className="px-4 py-3 text-end" aria-hidden />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-4 py-3 text-white/80">{invite.email}</td>
                    <td className="px-4 py-3">
                      <InviteStatusBadge status={invite.status} />
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {formatDate(invite.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {formatDate(invite.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {invite.status === InviteTokenStatus.PENDING && (
                        <DropdownMenu
                          ariaLabel={t("admin.companies.rowActionsLabel")}
                          trigger={
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/8 hover:text-white/80"
                            >
                              <span aria-hidden>⋮</span>
                            </button>
                          }
                        >
                          <DropdownMenuItem onSelect={() => handleResend(invite)}>
                            {t("admin.companies.resendAction")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="danger"
                            onSelect={() => setRevokePending(invite)}
                          >
                            {t("admin.companies.revokeAction")}
                          </DropdownMenuItem>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div ref={sentinelRef} />
          {isFetchingMore && (
            <p className="mt-4 text-center text-xs text-white/30">
              {t("common.loading")}
            </p>
          )}
        </>
      )}

      <InviteFormDialog
        open={showInviteForm}
        onClose={() => setShowInviteForm(false)}
        onCreated={(invite) => {
          prependItem(invite);
          setShowInviteForm(false);
        }}
      />

      <ConfirmDialog
        open={revokePending != null}
        onOpenChange={(o) => !o && setRevokePending(null)}
        title={t("admin.companies.revokeConfirmTitle")}
        message={t("admin.companies.inviteList.revokeConfirm")}
        confirmLabel={t("admin.companies.revokeAction")}
        variant="danger"
        isPending={pendingMutation}
        onConfirm={handleRevokeConfirm}
      />
    </>
  );
}

function InviteStatusBadge({ status }: { status: string }) {
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

// ── Detail dialog ──────────────────────────────────────────────────────────

interface DetailProps {
  profile: CompanyProfileRead | null;
  onClose: () => void;
  onEdit: () => void;
}

function CompanyDetailDialog({ profile, onClose, onEdit }: DetailProps) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobRead[] | null>(null);
  const [jobsError, setJobsError] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const ctrl = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setJobs(null);
    setJobsError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    // No backend ?company_id= filter on /admin/jobs yet; fetch first page and
    // filter client-side. Adequate while companies have ~5 jobs each.
    getJobs({ limit: 100 }, ctrl.signal)
      .then((page) =>
        setJobs(page.items.filter((j) => j.company_id === profile.id)),
      )
      .catch((e) => {
        if (axios.isCancel(e)) return;
        setJobsError(true);
      });
    return () => ctrl.abort();
  }, [profile]);

  if (!profile) return null;

  return (
    <Dialog
      open={profile != null}
      onOpenChange={(o) => !o && onClose()}
      title={profile.name}
      description={t("admin.companies.detailDescription")}
      size="lg"
      footer={
        <button
          onClick={onEdit}
          className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold"
        >
          {t("admin.companies.editAction")}
        </button>
      }
    >
      <CompanyDetailBody profile={profile} jobs={jobs} jobsError={jobsError} onLeavePage={onClose} />
    </Dialog>
  );
}

/**
 * Body content shared by the desktop CompanyDetailDialog and the mobile
 * inline expansion. Renders the profile fields + jobs section.
 */
function CompanyDetailBody({
  profile,
  user,
  jobs: jobsProp,
  jobsError: jobsErrorProp,
  onLeavePage,
}: {
  profile: CompanyProfileRead;
  user?: { email: string } | null;
  jobs?: JobRead[] | null;
  jobsError?: boolean;
  onLeavePage?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [localJobs, setLocalJobs] = useState<JobRead[] | null>(null);
  const [localJobsError, setLocalJobsError] = useState(false);
  // Self-fetch the jobs list when the parent didn't provide one (mobile inline).
  const useLocal = jobsProp === undefined;
  useEffect(() => {
    if (!useLocal) return;
    const ctrl = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocalJobs(null);
    setLocalJobsError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    getJobs({ limit: 100 }, ctrl.signal)
      .then((page) =>
        setLocalJobs(page.items.filter((j) => j.company_id === profile.id)),
      )
      .catch((e) => {
        if (axios.isCancel(e)) return;
        setLocalJobsError(true);
      });
    return () => ctrl.abort();
  }, [profile.id, useLocal]);
  const jobs = useLocal ? localJobs : jobsProp;
  const jobsError = useLocal ? localJobsError : (jobsErrorProp ?? false);
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        <dt className="text-white/35">{t("admin.companies.fields.companyId")}</dt>
        <dd className="text-white/70">
          {profile.company_id || t("admin.companies.noCompanyId")}
        </dd>
        {user?.email && (
          <>
            <dt className="text-white/35">{t("admin.companies.fields.email")}</dt>
            <dd className="text-white/70">
              <a
                href={`mailto:${user.email}`}
                className="text-copper/85 transition hover:text-copper hover:underline"
              >
                {user.email}
              </a>
            </dd>
          </>
        )}
        {profile.address && (
          <>
            <dt className="text-white/35">{t("admin.companies.fields.address")}</dt>
            <dd className="text-white/70">{profile.address}</dd>
          </>
        )}
        {(profile.contact_first_name || profile.contact_last_name) && (
          <>
            <dt className="text-white/35">{t("admin.companies.contactLabel")}</dt>
            <dd className="text-white/70">
              {profile.contact_first_name} {profile.contact_last_name}
            </dd>
          </>
        )}
        {profile.contact_mobile_phone && (
          <>
            <dt className="text-white/35">
              {t("admin.companies.fields.contactMobile")}
            </dt>
            <dd className="text-white/70">{profile.contact_mobile_phone}</dd>
          </>
        )}
        {profile.contact_landline_phone && (
          <>
            <dt className="text-white/35">
              {t("admin.companies.fields.contactLandline")}
            </dt>
            <dd className="text-white/70">{profile.contact_landline_phone}</dd>
          </>
        )}
        {profile.user_id == null && (
          <>
            <dt className="text-white/35">—</dt>
            <dd className="text-white/40">{t("admin.companies.noUserAccount")}</dd>
          </>
        )}
      </dl>

      <div className="border-t border-white/8 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("admin.companies.jobsSection")}
        </p>
        {jobsError ? (
          <p className="mt-3 text-xs text-danger">
            {t("admin.companies.errors.jobsLoadFailed")}
          </p>
        ) : jobs == null ? (
          <p className="mt-3 text-xs text-white/35">{t("common.loading")}</p>
        ) : jobs.length === 0 ? (
          <p className="mt-3 text-xs text-white/35">{t("admin.companies.noJobs")}</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {jobs.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => {
                    onLeavePage?.();
                    navigate(`/admin/jobs?detail=${j.id}`);
                  }}
                  className="flex w-full items-center justify-between rounded-sm border border-white/6 bg-card px-3 py-2 transition hover:border-copper/25 hover:bg-card-raised"
                >
                  <span className="text-white/80">{j.title}</span>
                  <span className="text-xs text-white/40">{j.location}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Edit company dialog ────────────────────────────────────────────────────

interface EditProps {
  profile: CompanyProfileRead | null;
  onClose: () => void;
  onSaved: (next: CompanyProfileRead) => void;
}

function EditCompanyDialog({ profile, onClose, onSaved }: EditProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState<CompanyProfileAdminUpdate>({});
  const [initialForm, setInitialForm] = useState<CompanyProfileAdminUpdate>({});
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const seed: CompanyProfileAdminUpdate = {
      name: profile.name,
      company_id: profile.company_id ?? "",
      address: profile.address ?? "",
      contact_first_name: profile.contact_first_name ?? "",
      contact_last_name: profile.contact_last_name ?? "",
      contact_mobile_phone: profile.contact_mobile_phone ?? "",
      contact_landline_phone: profile.contact_landline_phone ?? "",
    };
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm(seed);
    setInitialForm(seed);
    setValidationError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  function set<K extends keyof CompanyProfileAdminUpdate>(key: K, value: CompanyProfileAdminUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  function handleClose() {
    if (isDirty) { setConfirmDiscard(true); } else { onClose(); }
  }

  async function handleSave() {
    if (!profile) return;
    if (
      !form.name?.trim() ||
      !form.company_id?.trim() ||
      !form.address?.trim() ||
      !form.contact_first_name?.trim() ||
      !form.contact_last_name?.trim() ||
      !form.contact_mobile_phone?.trim()
    ) {
      setValidationError(t("common.validation.required")); return;
    }
    if (!COMPANY_ID_RE.test(form.company_id)) {
      setValidationError(t("admin.companies.validation.companyId")); return;
    }
    if (!MOBILE_RE.test(form.contact_mobile_phone)) {
      setValidationError(t("admin.companies.validation.mobile")); return;
    }
    setSaving(true);
    setValidationError(null);
    try {
      const updated = await updateCompanyProfile(profile.id, {
        ...form,
        contact_landline_phone: form.contact_landline_phone || null,
      });
      onSaved(updated);
    } catch {
      toast.error(t("admin.companies.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <>
    <Dialog
      open={profile != null}
      onOpenChange={(o) => !o && handleClose()}
      title={t("admin.companies.editModalTitle")}
      description={profile.name}
      size="lg"
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={saving}
            className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/60 hover:border-white/40 hover:text-white/90 disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <CompanyProfileFields
        form={form}
        setField={(k, v) =>
          set(
            k as keyof CompanyProfileAdminUpdate,
            v as CompanyProfileAdminUpdate[keyof CompanyProfileAdminUpdate],
          )
        }
      />
      {validationError && <p className="mt-3 text-xs text-danger">{validationError}</p>}
    </Dialog>
    <ConfirmDialog
      open={confirmDiscard}
      onOpenChange={(o) => !o && setConfirmDiscard(false)}
      title={t("common.discardTitle")}
      message={t("common.discardMessage")}
      cancelLabel={t("common.continueEditing")}
        confirmLabel={t("common.discard")}
      variant="danger"
      onConfirm={() => { setConfirmDiscard(false); onClose(); }}
    />
    </>
  );
}

// ── Create company dialog ──────────────────────────────────────────────────

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: (profile: CompanyProfileRead) => void;
}

function CreateCompanyDialog({ open, onClose, onCreated }: CreateProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState<Partial<CompanyProfileAdminCreate>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm({});
    setErrors({});
    setConfirmCreateOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  function set<K extends keyof CompanyProfileAdminCreate>(
    key: K,
    value: CompanyProfileAdminCreate[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear that field's error on edit.
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = t("common.validation.required");
    if (!form.company_id?.trim())
      e.company_id = t("common.validation.required");
    else if (!COMPANY_ID_RE.test(form.company_id))
      e.company_id = t("admin.companies.validation.companyId");
    if (!form.address?.trim()) e.address = t("common.validation.required");
    if (!form.contact_first_name?.trim())
      e.contact_first_name = t("common.validation.required");
    if (!form.contact_last_name?.trim())
      e.contact_last_name = t("common.validation.required");
    if (!form.contact_mobile_phone?.trim())
      e.contact_mobile_phone = t("common.validation.required");
    else if (!MOBILE_RE.test(form.contact_mobile_phone))
      e.contact_mobile_phone = t("admin.companies.validation.mobile");
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e, CREATE_COMPANY_FIELD_ORDER);
      return false;
    }
    return true;
  }

  function requestSave() {
    if (!validate()) return;
    setConfirmCreateOpen(true);
  }

  async function executeSave() {
    setConfirmCreateOpen(false);
    setSaving(true);
    try {
      const created = await adminCreateCompany({
        name: form.name!,
        company_id: form.company_id!,
        address: form.address!,
        contact_first_name: form.contact_first_name!,
        contact_last_name: form.contact_last_name!,
        contact_mobile_phone: form.contact_mobile_phone!,
        contact_landline_phone: form.contact_landline_phone || null,
      });
      toast.success(t("admin.companies.createdToast"));
      onCreated(created);
    } catch {
      toast.error(t("admin.companies.errors.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={t("admin.companies.newCompanyModalTitle")}
        description={t("admin.companies.newCompanyModalDescription")}
        size="lg"
        footer={
          <>
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/60 hover:border-white/40 hover:text-white/90 disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={requestSave}
              disabled={saving}
              className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white transition active:scale-95 hover:bg-gold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("admin.companies.createSubmit")}
            </button>
          </>
        }
      >
        <CompanyProfileFields
          form={form}
          setField={(k, v) =>
            set(
              k as keyof CompanyProfileAdminCreate,
              v as CompanyProfileAdminCreate[keyof CompanyProfileAdminCreate],
            )
          }
          errors={errors}
          showRequired
        />
        {hasErrors && (
          <p className="mt-3 text-xs text-danger">
            {t("admin.companies.validation.fixErrors")}
          </p>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmCreateOpen}
        onOpenChange={(o) => !o && setConfirmCreateOpen(false)}
        title={t("admin.companies.createConfirmTitle")}
        message={t("admin.companies.createConfirmMessage", { name: form.name })}
        confirmLabel={t("admin.companies.createSubmit")}
        onConfirm={executeSave}
      />
    </>
  );
}

// ── Shared profile field group ─────────────────────────────────────────────

interface ProfileFieldsProps {
  form: CompanyProfileAdminUpdate | Partial<CompanyProfileAdminCreate>;
  setField: (key: string, value: string) => void;
  errors?: Record<string, string>;
  /** If true, mark required fields with an asterisk and show inline hints. */
  showRequired?: boolean;
}

function CompanyProfileFields({
  form,
  setField,
  errors,
  showRequired = false,
}: ProfileFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      {/* Section: Company */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("admin.companies.formSections.company")}
        </p>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field
            label={t("admin.companies.fields.name")}
            required={showRequired}
            full
            name="name"
          >
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls}
              placeholder={t("admin.companies.placeholders.name")}
              aria-invalid={!!errors?.name}
            />
            {errors?.name && (
              <p className="mt-1 text-xs text-danger">{errors.name}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.companyId")}
            required={showRequired}
            hint={showRequired ? t("admin.companies.hints.companyId") : undefined}
            name="company_id"
          >
            <input
              type="text"
              inputMode="numeric"
              value={form.company_id ?? ""}
              onChange={(e) => setField("company_id", e.target.value)}
              className={inputCls}
              placeholder="123456789"
              aria-invalid={!!errors?.company_id}
              maxLength={9}
            />
            {errors?.company_id && (
              <p className="mt-1 text-xs text-danger">{errors.company_id}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.address")}
            required={showRequired}
            name="address"
          >
            <input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => setField("address", e.target.value)}
              className={inputCls}
              placeholder={t("admin.companies.placeholders.address")}
              aria-invalid={!!errors?.address}
            />
            {errors?.address && (
              <p className="mt-1 text-xs text-danger">{errors.address}</p>
            )}
          </Field>
        </div>
      </section>

      {/* Section: Contact person */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("admin.companies.formSections.contact")}
        </p>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field
            label={t("admin.companies.fields.contactFirstName")}
            required={showRequired}
            name="contact_first_name"
          >
            <input
              type="text"
              value={form.contact_first_name ?? ""}
              onChange={(e) => setField("contact_first_name", e.target.value)}
              className={inputCls}
              autoComplete="given-name"
              aria-invalid={!!errors?.contact_first_name}
            />
            {errors?.contact_first_name && (
              <p className="mt-1 text-xs text-danger">{errors.contact_first_name}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.contactLastName")}
            required={showRequired}
            name="contact_last_name"
          >
            <input
              type="text"
              value={form.contact_last_name ?? ""}
              onChange={(e) => setField("contact_last_name", e.target.value)}
              className={inputCls}
              autoComplete="family-name"
              aria-invalid={!!errors?.contact_last_name}
            />
            {errors?.contact_last_name && (
              <p className="mt-1 text-xs text-danger">{errors.contact_last_name}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.contactMobile")}
            required={showRequired}
            hint={showRequired ? t("admin.companies.hints.mobile") : undefined}
            name="contact_mobile_phone"
          >
            <input
              type="tel"
              value={form.contact_mobile_phone ?? ""}
              onChange={(e) => setField("contact_mobile_phone", e.target.value)}
              className={inputCls}
              placeholder="0501234567"
              autoComplete="tel"
              aria-invalid={!!errors?.contact_mobile_phone}
              maxLength={10}
            />
            {errors?.contact_mobile_phone && (
              <p className="mt-1 text-xs text-danger">{errors.contact_mobile_phone}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.contactLandline")}
            optional
          >
            <input
              type="tel"
              value={form.contact_landline_phone ?? ""}
              onChange={(e) => setField("contact_landline_phone", e.target.value)}
              className={inputCls}
              placeholder="03-1234567"
              autoComplete="tel"
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  full,
  required,
  optional,
  hint,
  name,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  name?: string;
}) {
  const { t } = useTranslation();
  return (
    <label
      className={`block ${full ? "sm:col-span-2" : ""}`}
      data-field={name}
    >
      <span className="flex items-center gap-1.5 text-xs text-white/55">
        <span>{label}</span>
        {required && <span className="text-copper/80">*</span>}
        {optional && (
          <span className="text-[10px] text-white/30">({t("common.optional")})</span>
        )}
      </span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-[11px] text-white/30">{hint}</span>}
    </label>
  );
}

// ── Invite form dialog ─────────────────────────────────────────────────────

interface InviteFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invite: InviteTokenRead) => void;
}

function InviteFormDialog({ open, onClose, onCreated }: InviteFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState<InviteTokenCreate>({ email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm({ email: "" });
    setErrorKey(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  async function handleSubmit() {
    setErrorKey(null);
    setSubmitting(true);
    try {
      const created = await createInvite(form);
      toast.success(t("admin.companies.inviteForm.successMessage"));
      onCreated(created);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response.data?.detail ?? "";
        if (
          typeof detail === "string" &&
          detail.toLowerCase().includes("pending invite")
        ) {
          setErrorKey("admin.companies.inviteForm.errorPendingInvite");
        } else {
          setErrorKey("admin.companies.inviteForm.errorEmailExists");
        }
      } else {
        setErrorKey("admin.companies.inviteForm.errorMessage");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("admin.companies.inviteForm.title")}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/60 hover:border-white/40 hover:text-white/90 disabled:opacity-60"
          >
            {t("admin.companies.inviteForm.cancelButton")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.email}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:opacity-60"
          >
            {submitting
              ? t("admin.companies.inviteForm.submittingButton")
              : t("admin.companies.inviteForm.submitButton")}
          </button>
        </>
      }
    >
      <InviteFlowExplainer />
      <label className="block text-sm">
        <span className="block text-xs text-white/45">
          {t("admin.companies.inviteForm.emailLabel")}
        </span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ email: e.target.value })}
          className={`mt-1 ${inputCls}`}
          placeholder={t("admin.companies.inviteForm.emailPlaceholder")}
        />
      </label>
      {errorKey && <p className="mt-3 text-xs text-danger">{t(errorKey)}</p>}
    </Dialog>
  );
}

/** Short visual flow of what happens after the admin sends an invite. */
function InviteFlowExplainer() {
  const { t } = useTranslation();
  const steps = [
    {
      label: t("admin.companies.inviteForm.flow.step1"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      ),
    },
    {
      label: t("admin.companies.inviteForm.flow.step2"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-3v6m3-3h-6" />
        </svg>
      ),
    },
    {
      label: t("admin.companies.inviteForm.flow.step3"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
        </svg>
      ),
    },
    {
      label: t("admin.companies.inviteForm.flow.step4"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11V7a4 4 0 1 0-8 0v4M5 11h14v8H5Z" />
        </svg>
      ),
    },
    {
      label: t("admin.companies.inviteForm.flow.step5"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
    },
  ];
  return (
    <div className="mb-5 rounded-md border border-white/8 bg-card/40 p-3">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
        {t("admin.companies.inviteForm.flow.title")}
      </p>
      {/* dir="ltr" so the step sequence renders left-to-right regardless of
          document direction. Hebrew labels inside each cell still render RTL
          naturally because the characters themselves carry direction. */}
      <ol dir="ltr" className="flex items-start gap-1">
        {steps.map((step, i) => (
          <li key={i} className="flex flex-1 items-start gap-1">
            <div className="flex flex-1 flex-col items-center text-center">
              <div className="flex size-7 items-center justify-center rounded-full border border-copper/35 bg-copper/10 text-copper">
                {step.icon}
              </div>
              <p className="mt-1.5 leading-tight text-[10px] text-white/65">
                {step.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="mt-2.5 size-3 shrink-0 text-white/25"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
