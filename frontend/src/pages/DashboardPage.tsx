import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/api";

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
      <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t("dashboard.welcomeBack")}{" "}
        <span className="font-medium text-gray-700">{user?.email}</span>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <p className="font-semibold text-gray-900 group-hover:text-blue-600">
              {link.label}
            </p>
            <p className="mt-1 text-sm text-gray-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
