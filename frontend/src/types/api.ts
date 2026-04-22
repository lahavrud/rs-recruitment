/**
 * TypeScript types mirroring backend schemas (src/schemas.py + src/enums.py).
 *
 * Uses `as const` objects instead of enums — required by TS 6.0
 * with erasableSyntaxOnly enabled (enums emit runtime code).
 */

// --- Enums (const objects + union types) ---

export const UserRole = {
  ADMIN: "ADMIN",
  COMPANY: "COMPANY",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const JobStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const ApplicationStatus = {
  NEW: "NEW",
  APPROVED_BY_ADMIN: "APPROVED_BY_ADMIN",
  REJECTED: "REJECTED",
  HIRED: "HIRED",
} as const;
export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

// --- Auth ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// --- Users ---

export interface UserRead {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface CompanyProfileRead {
  id: number;
  user_id: number;
  name: string;
  logo_url: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface UserWithCompanyRead {
  user: UserRead;
  company_profile: CompanyProfileRead;
}

// --- JWT Payload (decoded client-side) ---

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  exp: number;
}

// --- Health ---

export interface HealthResponse {
  status: string;
  environment: string;
}
