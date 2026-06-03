import type { CompanyProfileRead, UserRead } from "@/types/auth";

export interface PendingCompanyRead {
  user: UserRead;
  company_profile: CompanyProfileRead;
  invitation_sent: boolean;
}

export interface ApprovedCompanyRead {
  user: UserRead;
  company_profile: CompanyProfileRead;
}

export interface ActiveCompanyRead {
  /** Null for profiles created directly by admins (no user account yet). */
  user: UserRead | null;
  company_profile: CompanyProfileRead;
}
