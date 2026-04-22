import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">RS Recruitment</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.email}</span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {user?.role}
        </span>
        <button
          onClick={logout}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
