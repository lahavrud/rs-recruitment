import type { InviteTokenStatus } from "@/types/enums";

export interface InviteTokenCreate {
  email: string;
}

export interface InviteTokenRead {
  id: number;
  token_hash: string;
  email: string;
  company_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  note: string | null;
  status: InviteTokenStatus;
  created_by_admin_id: number;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export interface InviteMetadataPublic {
  email: string;
}
