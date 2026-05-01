import api from "@/services/api";
import type { LoginRequest, TokenResponse, UserWithCompanyRead } from "@/types/api";
import { removeToken, setToken } from "@/utils/token";

export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/auth/login", credentials);
  setToken(response.data.access_token);
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

/**
 * Clear the stored token and redirect to login.
 */
export function logout(): void {
  removeToken();
  window.location.href = "/login";
}
