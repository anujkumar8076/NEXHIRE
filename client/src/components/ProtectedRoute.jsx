import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );

  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (role && user.role !== role)
    return <Navigate to={user.role === "recruiter" ? "/recruiter/dashboard" : "/jobs"} replace />;

  return children;
}
