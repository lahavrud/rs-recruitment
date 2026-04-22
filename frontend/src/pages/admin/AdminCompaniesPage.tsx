import { useEffect, useState } from "react";
import { approveCompany, getPendingCompanies, rejectCompany } from "@/services/admin";
import type { PendingCompanyRead } from "@/types/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<PendingCompanyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<number | null>(null); // userId being actioned

  useEffect(() => {
    getPendingCompanies()
      .then(setCompanies)
      .catch(() => setError("Failed to load pending companies."))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(userId: number) {
    setActing(userId);
    try {
      await approveCompany(userId);
      setCompanies((prev) => prev.filter((c) => c.user.id !== userId));
    } catch {
      setError("Failed to approve company.");
    } finally {
      setActing(null);
    }
  }

  async function handleReject(userId: number) {
    if (!confirm("Reject and permanently delete this company registration?")) return;
    setActing(userId);
    try {
      await rejectCompany(userId);
      setCompanies((prev) => prev.filter((c) => c.user.id !== userId));
    } catch {
      setError("Failed to reject company.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Companies</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve company registrations.
          </p>
        </div>
        {!loading && (
          <span className="rounded-full bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-700">
            {companies.length} pending
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-20 text-center text-gray-400">
          No pending company registrations.
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => {
            const busy = acting === c.user.id;
            return (
              <div
                key={c.user.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Info */}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{c.company_profile.name}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{c.user.email}</p>
                  {c.company_profile.contact_person && (
                    <p className="text-sm text-gray-500">
                      Contact: {c.company_profile.contact_person}
                      {c.company_profile.contact_phone &&
                        ` · ${c.company_profile.contact_phone}`}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Registered {formatDate(c.user.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(c.user.id)}
                    disabled={busy}
                    className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {busy ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(c.user.id)}
                    disabled={busy}
                    className="rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
