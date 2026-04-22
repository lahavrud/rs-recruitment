import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/api";

interface NavItem {
  label: string;
  to: string;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "Companies", to: "/admin/companies" },
  { label: "Jobs", to: "/admin/jobs" },
  { label: "Applications", to: "/admin/applications" },
  { label: "Candidates", to: "/admin/candidates" },
];

const companyNav: NavItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "My Jobs", to: "/jobs" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const navItems = user?.role === UserRole.ADMIN ? adminNav : companyNav;

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-gray-50">
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
