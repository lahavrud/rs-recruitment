/**
 * Admin API service.
 * All endpoints require ADMIN role JWT.
 */
import api from "@/services/api";
import type {
  ApprovedCompanyRead,
  ApplicationRead,
  ApplicationStatusUpdate,
  ApplicationWithDetails,
  ApplicationStatus,
  JobRead,
  PendingCompanyRead,
} from "@/types/api";

// ── Companies ────────────────────────────────────────────────────────────────

export async function getPendingCompanies(): Promise<PendingCompanyRead[]> {
  const res = await api.get<PendingCompanyRead[]>("/api/admin/companies/pending");
  return res.data;
}

export async function approveCompany(userId: number): Promise<ApprovedCompanyRead> {
  const res = await api.post<ApprovedCompanyRead>(
    `/api/admin/companies/${userId}/approve`,
  );
  return res.data;
}

export async function rejectCompany(userId: number): Promise<void> {
  await api.post(`/api/admin/companies/${userId}/reject`);
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function getPendingJobs(): Promise<JobRead[]> {
  const res = await api.get<JobRead[]>("/api/admin/jobs/pending");
  return res.data;
}

export async function approveJob(jobId: number): Promise<JobRead> {
  const res = await api.post<JobRead>(`/api/admin/jobs/${jobId}/approve`);
  return res.data;
}

export async function rejectJob(jobId: number): Promise<void> {
  await api.post(`/api/admin/jobs/${jobId}/reject`);
}

// ── Applications ─────────────────────────────────────────────────────────────

export async function getApplications(params?: {
  status?: ApplicationStatus;
  job_id?: number;
  candidate_id?: number;
}): Promise<ApplicationWithDetails[]> {
  const res = await api.get<ApplicationWithDetails[]>("/api/admin/applications", {
    params,
  });
  return res.data;
}

export async function updateApplicationStatus(
  appId: number,
  body: ApplicationStatusUpdate,
): Promise<ApplicationRead> {
  const res = await api.put<ApplicationRead>(
    `/api/admin/applications/${appId}/status`,
    body,
  );
  return res.data;
}
