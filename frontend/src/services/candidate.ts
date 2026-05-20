/**
 * Candidate self-service API client (Sprint 11 / #608).
 *
 * Wraps:
 *   GET    /api/candidate/me
 *   PATCH  /api/candidate/me
 *   POST   /api/candidate/me/resume          (multipart)
 *   DELETE /api/candidate/me/resume
 *   POST   /auth/me/password                  (role-agnostic in-session change)
 *   POST   /api/candidate/me/export           (async build → emailed link)
 */

import api from "@/services/api";

export interface CandidateMeRead {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  linkedin_url: string | null;
  resume_path: string | null;
  consent_given_at: string | null;
  consent_policy_version: string | null;
  created_at: string;
}

export interface CandidateMeUpdate {
  full_name?: string;
  phone?: string;
  linkedin_url?: string | null;
}

export async function getMe(): Promise<CandidateMeRead> {
  const res = await api.get<CandidateMeRead>("/api/candidate/me");
  return res.data;
}

export async function patchMe(
  patch: CandidateMeUpdate,
): Promise<CandidateMeRead> {
  const res = await api.patch<CandidateMeRead>("/api/candidate/me", patch);
  return res.data;
}

export async function uploadResume(file: File): Promise<CandidateMeRead> {
  const data = new FormData();
  data.append("resume", file, file.name);
  const res = await api.post<CandidateMeRead>("/api/candidate/me/resume", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteResume(): Promise<CandidateMeRead> {
  const res = await api.delete<CandidateMeRead>("/api/candidate/me/resume");
  return res.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function requestDataExport(): Promise<void> {
  await api.post("/api/candidate/me/export");
}
