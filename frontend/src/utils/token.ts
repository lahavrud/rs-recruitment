import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "@/types/api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Decode a JWT token payload without verifying the signature.
 * Verification is done server-side on every request.
 * Returns null if the token is invalid or expired.
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);

    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      removeToken();
      return null;
    }

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }

    return payload;
  } catch {
    removeToken();
    return null;
  }
}
