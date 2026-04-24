import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/api";

/** Renders children only for authenticated admins; redirects otherwise. */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== UserRole.ADMIN) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
