import { useEffect, useState } from "react";
import { getApplications, updateApplicationStatus } from "@/services/admin";
import { ApplicationStatus } from "@/types/api";
import type { ApplicationStatusUpdate, ApplicationWithDetails } from "@/types/api";

// Valid next statuses per current status
const NEXT_STATUSES: Record<string, string[]> = {
  NEW: [ApplicationStatus.APPROVED_BY_ADMIN, ApplicationStatus.REJECTED],
  APPROVED_BY_ADMIN: [ApplicationStatus.HIRED, ApplicationStatus.REJECTED],
  REJECTED: [],
  HIRED: [],
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  APPROVED_BY_ADMIN: "Approved",
  REJECTED: "Rejected",
  HIRED: "Hired",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  APPROVED_BY_ADMIN: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  HIRED: "bg-purple-50 text-purple-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ALL_FILTER = "ALL";
type FilterValue = string; // ApplicationStatus value or "ALL"

interface UpdateModal {
  app: ApplicationWithDetails;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>(ALL_FILTER);

  // Update status modal state
  const [modal, setModal] = useState<UpdateModal | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch(() => setError("Failed to load applications."))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === ALL_FILTER
      ? applications
      : applications.filter((a) => a.status === filter);

  function openModal(app: ApplicationWithDetails) {
    const nexts = NEXT_STATUSES[app.status] ?? [];
    setModal({ app });
    setNewStatus(nexts[0] ?? "");
    setAdminNotes(app.admin_notes ?? "");
    setSaveError(null);
  }

  function closeModal() {
    setModal(null);
    setSaveError(null);
  }

  async function handleSaveStatus() {
    if (!modal || !newStatus) return;
    setSaving(true);
    setSaveError(null);
    const body: ApplicationStatusUpdate = {
      status: newStatus as ApplicationStatusUpdate["status"],
      admin_notes: adminNotes.trim() || null,
    };
    try {
      const updated = await updateApplicationStatus(modal.app.id, body);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === modal.app.id
            ? { ...a, status: updated.status, admin_notes: updated.admin_notes }
            : a,
        ),
      );
      closeModal();
    } catch {
      setSaveError("Failed to update status. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const filterTabs: FilterValue[] = [
    ALL_FILTER,
    ApplicationStatus.NEW,
    ApplicationStatus.APPROVED_BY_ADMIN,
    ApplicationStatus.REJECTED,
    ApplicationStatus.HIRED,
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and update candidate application statuses.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const count =
            tab === ALL_FILTER
              ? applications.length
              : applications.filter((a) => a.status === tab).length;
          const active = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab === ALL_FILTER ? "All" : STATUS_LABELS[tab]} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-20 text-center text-gray-400">
          No applications found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Candidate</th>
                <th className="px-4 py-3 text-left">Job</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((app) => {
                const canUpdate = (NEXT_STATUSES[app.status] ?? []).length > 0;
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {app.candidate.full_name}
                      </p>
                      <p className="text-xs text-gray-500">{app.candidate.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{app.job.title}</p>
                      <p className="text-xs text-gray-500">{app.job.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}
                      >
                        {STATUS_LABELS[app.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {canUpdate ? (
                        <button
                          onClick={() => openModal(app)}
                          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Update
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Update status modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Update Application Status</h2>
            <div className="mt-3 space-y-0.5 text-sm text-gray-600">
              <p>
                <span className="font-medium">Candidate:</span>{" "}
                {modal.app.candidate.full_name}
              </p>
              <p>
                <span className="font-medium">Job:</span> {modal.app.job.title}
              </p>
              <p>
                <span className="font-medium">Current status:</span>{" "}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[modal.app.status]}`}
                >
                  {STATUS_LABELS[modal.app.status]}
                </span>
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {(NEXT_STATUSES[modal.app.status] ?? []).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Admin Notes{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Add notes visible to the team…"
                />
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-sm text-red-600">{saveError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatus}
                disabled={saving || !newStatus}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
