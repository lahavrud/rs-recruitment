import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function PublicLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal public header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            to="/jobs"
            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            RS Recruitment
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/jobs" className="text-sm text-gray-600 hover:text-gray-900">
              Jobs
            </Link>
            {isAuthenticated ? (
              <Link
                to="/"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
