import api from "@/services/api";
import type {
  InviteMetadataPublic,
  LoginRequest,
  TokenResponse,
  UserWithCompanyRead,
} from "@/types/api";
import {
  getRefreshToken,
  getToken,
  removeRefreshToken,
  removeToken,
  setRefreshToken,
  setToken,
} from "@/utils/token";

export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/auth/login", credentials);
  setToken(response.data.access_token);
  setRefreshToken(response.data.refresh_token);
  return response.data;
}

export async function register(
  formData: FormData,
  inviteToken: string,
): Promise<UserWithCompanyRead> {
  const response = await api.post<UserWithCompanyRead>("/auth/register", formData, {
    params: { token: inviteToken },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function refreshTokens(): Promise<TokenResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await api.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  setToken(response.data.access_token);
  setRefreshToken(response.data.refresh_token);
  return response.data;
}

export async function getInviteMetadata(
  token: string,
): Promise<InviteMetadataPublic> {
  const res = await api.get<InviteMetadataPublic>(`/auth/invite/${token}`);
  return res.data;
}

export async function activateAccount(token: string): Promise<void> {
  await api.post(`/auth/activate`, null, {
    params: { token },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function validateResetToken(token: string): Promise<void> {
  await api.get("/auth/reset-password/validate", { params: { token } });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/reset-password", {
    token,
    new_password: newPassword,
  });
}

export function logout(): void {
  // Capture tokens BEFORE clearing — the server endpoint requires the access
  // token for auth and the refresh token for revocation. Clearing first
  // would cause a 401 because no Authorization header would be attached.
  const accessToken = getToken();
  const refreshToken = getRefreshToken();
  removeToken();
  removeRefreshToken();
  // Best-effort server-side revocation. We use `fetch` with `keepalive: true`
  // instead of axios so the request survives the navigation that almost
  // always follows logout() — otherwise Firefox cancels it mid-flight and
  // logs `NS_BINDING_ABORTED`.
  const baseURL = import.meta.env.DEV
    ? ""
    : (import.meta.env.VITE_API_BASE_URL ?? "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    void fetch(`${baseURL}/auth/logout`, {
      method: "POST",
      keepalive: true,
      headers,
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : null),
    }).catch(() => {});
  } catch {
    // sendBeacon-style fire-and-forget — swallow sync errors too
  }
}
