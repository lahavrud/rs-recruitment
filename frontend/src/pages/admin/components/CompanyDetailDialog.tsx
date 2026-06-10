import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { CompanyProfileRead, JobRead } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Eyebrow from "@/components/ui/Eyebrow";
import { useCompanyJobs } from "./useCompanyJobs";

interface DetailProps {
  profile: CompanyProfileRead | null;
  onClose: () => void;
  onEdit: () => void;
  /** Pending tab shows the same body but hides the Edit CTA. */
  hideEditButton?: boolean;
}

export default function CompanyDetailDialog({
  profile,
  onClose,
  onEdit,
  hideEditButton = false,
}: DetailProps) {
  const { t } = useTranslation(['admin', 'common']);
  const { jobs, jobsError } = useCompanyJobs(profile?.id);

  if (!profile) return null;

  return (
    <Dialog
      open={profile != null}
      onOpenChange={(o) => !o && onClose()}
      title={profile.name}
      description={t("admin:companies.detailDescription")}
      size="lg"
      footer={
        hideEditButton ? undefined : (
          <Button
            onClick={onEdit}
          >
            {t("admin:companies.editAction")}
          </Button>
        )
      }
    >
      <CompanyDetailBody profile={profile} jobs={jobs} jobsError={jobsError} onLeavePage={onClose} />
    </Dialog>
  );
}

/**
 * Body content shared by the desktop CompanyDetailDialog and the mobile
 * inline expansion. Renders the profile fields + jobs section.
 */
export function CompanyDetailBody({
  profile,
  jobs: jobsProp,
  jobsError: jobsErrorProp,
  onLeavePage,
}: {
  profile: CompanyProfileRead;
  jobs?: JobRead[] | null;
  jobsError?: boolean;
  onLeavePage?: () => void;
}) {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  // Self-fetch the jobs list when the parent didn't provide one (mobile inline).
  const useLocal = jobsProp === undefined;
  const local = useCompanyJobs(useLocal ? profile.id : undefined);
  const jobs = useLocal ? local.jobs : jobsProp;
  const jobsError = useLocal ? local.jobsError : (jobsErrorProp ?? false);
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        <dt className="text-white/35">{t("admin:companies.fields.companyId")}</dt>
        <dd className="text-white/70">
          {profile.company_id || t("admin:companies.noCompanyId")}
        </dd>
        {profile.contact_email && (
          <>
            <dt className="text-white/35">{t("admin:companies.fields.email")}</dt>
            <dd className="text-white/70">
              <a
                href={`mailto:${profile.contact_email}`}
                className="text-copper/85 transition hover:text-copper hover:underline"
              >
                {profile.contact_email}
              </a>
            </dd>
          </>
        )}
        {profile.address && (
          <>
            <dt className="text-white/35">{t("admin:companies.fields.address")}</dt>
            <dd className="text-white/70">{profile.address}</dd>
          </>
        )}
        {(profile.contact_first_name || profile.contact_last_name) && (
          <>
            <dt className="text-white/35">{t("admin:companies.contactLabel")}</dt>
            <dd className="text-white/70">
              {profile.contact_first_name} {profile.contact_last_name}
            </dd>
          </>
        )}
        {profile.contact_mobile_phone && (
          <>
            <dt className="text-white/35">
              {t("admin:companies.fields.contactMobile")}
            </dt>
            <dd className="text-white/70">{profile.contact_mobile_phone}</dd>
          </>
        )}
        {profile.contact_landline_phone && (
          <>
            <dt className="text-white/35">
              {t("admin:companies.fields.contactLandline")}
            </dt>
            <dd className="text-white/70">{profile.contact_landline_phone}</dd>
          </>
        )}
        {profile.user_id == null && (
          <>
            <dt className="text-white/35">—</dt>
            <dd className="text-white/40">{t("admin:companies.noUserAccount")}</dd>
          </>
        )}
      </dl>

      <div className="border-t border-white/8 pt-4">
        <Eyebrow>
          {t("admin:companies.jobsSection")}
        </Eyebrow>
        {jobsError ? (
          <p className="mt-3 text-xs text-danger">
            {t("admin:companies.errors.jobsLoadFailed")}
          </p>
        ) : jobs == null ? (
          <p className="mt-3 text-xs text-white/35">{t("common:loading")}</p>
        ) : jobs.length === 0 ? (
          <p className="mt-3 text-xs text-white/35">{t("admin:companies.noJobs")}</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {jobs.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => {
                    onLeavePage?.();
                    navigate(`/admin/jobs?detail=${j.id}`);
                  }}
                  className="flex w-full items-center justify-between rounded-sm border border-white/6 bg-card px-3 py-2 transition hover:border-copper/25 hover:bg-card-raised"
                >
                  <span className="text-white/80">{j.title}</span>
                  <span className="text-xs text-white/40">{j.location}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
