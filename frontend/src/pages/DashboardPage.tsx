import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/api";

interface QuickLink {
  label: string;
  description: string;
  to: string;
}

const adminLinks: QuickLink[] = [
  {
    label: "Pending Companies",
    description: "Review and approve company registrations.",
    to: "/admin/companies",
  },
  {
    label: "Pending Jobs",
    description: "Approve or reject job postings before they go live.",
    to: "/admin/jobs",
  },
  {
    label: "Applications",
    description: "Track and update candidate application statuses.",
    to: "/admin/applications",
  },
  {
    label: "Candidates",
    description: "Browse candidate profiles.",
    to: "/admin/candidates",
  },
];

const companyLinks: QuickLink[] = [
  {
    label: "My Jobs",
    description: "Post new jobs and manage your existing listings.",
    to: "/company/jobs",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const links = user?.role === UserRole.ADMIN ? adminLinks : companyLinks;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Welcome back,{" "}
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
