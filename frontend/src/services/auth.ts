import api from "@/services/api";
import type { LoginRequest, TokenResponse } from "@/types/api";
import { removeToken, setToken } from "@/utils/token";

/**
 * Authenticate a user and store the JWT token.
 * Returns the token response on success.
 * Throws an AxiosError on failure (e.g., 401 invalid credentials, 403 inactive).
 */
export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/auth/login", credentials);
  setToken(response.data.access_token);
  return response.data;
}

/**
 * Clear the stored token and redirect to login.
 */
export function logout(): void {
  removeToken();
  window.location.href = "/login";
}
