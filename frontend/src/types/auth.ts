import type { UserRole } from "@/types/enums";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** Decoded JWT payload (client-side only). */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  exp: number;
}

export interface UserRead {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface CompanyProfileCreate {
  name: string;
  company_id: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_mobile_phone: string;
  contact_landline_phone?: string | null;
}

export interface CompanyProfileRead {
  id: number;
  /** Null when the profile was created directly by an admin without a user account. */
  user_id: number | null;
  name: string;
  logo_url: string | null;
  company_id: string;
  address: string;
  contact_email: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_mobile_phone: string;
  contact_landline_phone: string | null;
  agreement_signed_at: string | null;
  privacy_accepted_at: string | null;
  created_at: string;
}

/** Mirrors backend CompanyProfileAdminCreate schema. */
export interface CompanyProfileAdminCreate {
  name: string;
  company_id: string;
  address: string;
  contact_email: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_mobile_phone: string;
  contact_landline_phone?: string | null;
}

/** Mirrors backend CompanyProfileAdminUpdate (all fields optional). */
export interface CompanyProfileAdminUpdate {
  name?: string;
  company_id?: string;
  address?: string;
  contact_email?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_mobile_phone?: string;
  contact_landline_phone?: string | null;
}

export interface UserWithCompanyRead {
  user: UserRead;
  company_profile: CompanyProfileRead;
}
