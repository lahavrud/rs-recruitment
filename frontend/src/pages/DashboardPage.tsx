import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const links = isAdmin
    ? [
        { label: t("dashboard.adminLinks.pendingCompanies"), description: t("dashboard.adminLinks.pendingCompaniesDesc"), to: "/admin/companies" },
        { label: t("dashboard.adminLinks.pendingJobs"), description: t("dashboard.adminLinks.pendingJobsDesc"), to: "/admin/jobs" },
        { label: t("dashboard.adminLinks.applications"), description: t("dashboard.adminLinks.applicationsDesc"), to: "/admin/applications" },
        { label: t("dashboard.adminLinks.candidates"), description: t("dashboard.adminLinks.candidatesDesc"), to: "/admin/candidates" },
      ]
    : [
        { label: t("dashboard.companyLinks.myJobs"), description: t("dashboard.companyLinks.myJobsDesc"), to: "/company/jobs" },
      ];

  return (
    <div>
      <PageHeader
        eyebrow={t("dashboard.title")}
        subtitle={`${t("dashboard.welcomeBack")} ${user?.email ?? ""}`}
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group block rounded-xl border border-white/8 bg-card p-5 transition duration-200 hover:border-copper/25 hover:bg-card-raised"
          >
            <p className="font-medium text-white/80 transition group-hover:text-white/95">
              {link.label}
            </p>
            <p className="mt-1 text-sm text-white/40">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
