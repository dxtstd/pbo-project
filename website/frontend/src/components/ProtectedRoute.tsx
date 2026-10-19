import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../stores/auth";
import { useAuthStore } from "../stores/auth";

export function ProtectedRoute({ roles }: { roles: UserRole[] }) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === "owner" ? "/dashboard/owner" : user.role === "customer" ? "/dashboard/customer" : "/"} replace />;
  }
  return <Outlet />;
}
