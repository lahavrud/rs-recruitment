import type { JobStatus } from "@/types/enums";

export const JOB_SHORT_DESC_MAX = 140;
export const JOB_TAG_MAX_LEN = 30;
export const JOB_TAG_MAX_COUNT = 6;
export const JOB_REQ_TEXT_MAX = 200;
export const JOB_REQ_MIN_COUNT = 3;
export const JOB_REQ_MAX_COUNT = 15;

export interface JobRequirementItem {
  text: string;
}

export interface JobRead {
  id: number;
  company_id: number;
  title: string;
  short_description: string;
  description: string;
  requirements: JobRequirementItem[];
  tags: string[];
  is_featured: boolean;
  location: string;
  salary_min: number;
  salary_max: number;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface JobCreate {
  title: string;
  short_description: string;
  description: string;
  requirements: JobRequirementItem[];
  tags: string[];
  location: string;
  salary_min: number;
  salary_max: number;
}

export interface JobUpdate {
  title?: string;
  short_description?: string;
  description?: string;
  requirements?: JobRequirementItem[];
  tags?: string[];
  location?: string;
  /** NOT NULL in DB — backend rejects explicit null. Omit to leave unchanged. */
  salary_min?: number;
  /** NOT NULL in DB — backend rejects explicit null. Omit to leave unchanged. */
  salary_max?: number;
  status?: JobStatus;
}

/** Mirrors backend JobAdminCreate schema. */
export interface JobAdminCreate {
  company_id: number;
  title: string;
  short_description: string;
  description: string;
  requirements: JobRequirementItem[];
  tags: string[];
  is_featured?: boolean;
  location: string;
  salary_min: number;
  salary_max: number;
  status?: JobStatus;
}

/** Mirrors backend JobAdminUpdate — extends JobUpdate with is_featured. */
export interface JobAdminUpdate extends JobUpdate {
  is_featured?: boolean;
}

/** Mirrors backend JobPublicRead schema. Status is omitted (only PUBLISHED returned). */
export interface JobPublicRead {
  id: number;
  title: string;
  short_description: string;
  description: string;
  requirements: JobRequirementItem[];
  tags: string[];
  is_featured: boolean;
  location: string;
  salary_min: number;
  salary_max: number;
  created_at: string;
}
