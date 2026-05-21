import type { TFunction } from "i18next";
import {
  JOB_DESC_MAX,
  JOB_LOCATION_MAX,
  JOB_REQ_MIN_COUNT,
  JOB_SHORT_DESC_MAX,
  JOB_TITLE_MAX,
} from "@/types/api";
import type { JobRequirementItem } from "@/types/api";
import { COMPANY_ID_RE, EMAIL_RE, MOBILE_RE } from "./validation";

// ── Company profile ─────────────────────────────────────────────────────────

export interface CompanyProfileValidatable {
  name?: string;
  company_id?: string;
  address?: string;
  contact_email?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_mobile_phone?: string;
  contact_landline_phone?: string | null;
}

/**
 * Validates the admin company-profile form. Returns a field→message map
 * (empty if valid). Used by both the create and edit dialogs.
 */
export function validateCompanyProfile(
  form: CompanyProfileValidatable,
  t: TFunction,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.name?.trim()) e.name = t("common.validation.required");
  if (!form.company_id?.trim()) e.company_id = t("common.validation.required");
  else if (!COMPANY_ID_RE.test(form.company_id))
    e.company_id = t("admin.companies.validation.companyId");
  if (!form.address?.trim()) e.address = t("common.validation.required");
  if (!form.contact_email?.trim())
    e.contact_email = t("common.validation.required");
  else if (!EMAIL_RE.test(form.contact_email))
    e.contact_email = t("admin.companies.validation.email");
  if (!form.contact_first_name?.trim())
    e.contact_first_name = t("common.validation.required");
  if (!form.contact_last_name?.trim())
    e.contact_last_name = t("common.validation.required");
  if (!form.contact_mobile_phone?.trim())
    e.contact_mobile_phone = t("common.validation.required");
  else if (!MOBILE_RE.test(form.contact_mobile_phone))
    e.contact_mobile_phone = t("admin.companies.validation.mobile");
  return e;
}

// ── Job ─────────────────────────────────────────────────────────────────────

export interface JobValidatable {
  title?: string;
  short_description?: string;
  description?: string;
  location?: string;
  requirements?: JobRequirementItem[];
  salary_min?: number;
  salary_max?: number;
}

/**
 * Validates the admin job form (used by create + edit). Returns a
 * field→message map; empty if valid.
 */
export function validateJob(
  form: JobValidatable,
  t: TFunction,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.title?.trim()) e.title = t("common.validation.required");
  else if (form.title.length > JOB_TITLE_MAX)
    e.title = t("common.validation.tooLong", { max: JOB_TITLE_MAX });
  if (!form.short_description?.trim())
    e.short_description = t("common.validation.required");
  else if (form.short_description.length > JOB_SHORT_DESC_MAX)
    e.short_description = t("common.validation.tooLong", { max: JOB_SHORT_DESC_MAX });
  if (!form.location?.trim()) e.location = t("common.validation.required");
  else if (form.location.length > JOB_LOCATION_MAX)
    e.location = t("common.validation.tooLong", { max: JOB_LOCATION_MAX });
  if (!form.description?.trim()) e.description = t("common.validation.required");
  else if (form.description.length > JOB_DESC_MAX)
    e.description = t("common.validation.tooLong", { max: JOB_DESC_MAX });
  const filledReqs = (form.requirements ?? []).filter(
    (r) => r.text.trim().length > 0,
  );
  if (filledReqs.length < JOB_REQ_MIN_COUNT)
    e.requirements = t("common.validation.requirementsMin", { min: JOB_REQ_MIN_COUNT });
  if (form.salary_min == null || form.salary_min < 0)
    e.salary_min = t("common.validation.required");
  if (form.salary_max == null || form.salary_max < 0)
    e.salary_max = t("common.validation.required");
  else if (form.salary_min != null && form.salary_max < form.salary_min)
    e.salary_max = t("common.validation.salaryMaxBelowMin");
  return e;
}
