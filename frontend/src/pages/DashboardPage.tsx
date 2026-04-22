import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome back, <span className="font-medium">{user?.email}</span>
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Role: <span className="font-medium">{user?.role}</span>
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-400">
        Dashboard content will be implemented in a future issue.
      </div>
    </div>
  );
}
