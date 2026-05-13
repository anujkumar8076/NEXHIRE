import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider }        from "./context/SocketContext";

import Navbar          from "./components/Navbar";
import ProtectedRoute  from "./components/ProtectedRoute";

import Login       from "./pages/Login";
import Register    from "./pages/Register";
import JobList     from "./pages/JobList";
import AppliedJobs from "./pages/AppliedJobs";
import Bookmarks   from "./pages/Bookmarks";
import ResumePage  from "./pages/ResumePage";
import PostJob     from "./pages/PostJob";
import RecruiterDashboard from "./components/Dashboard";

function Shell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50/60 antialiased">
      <Navbar />
      <main className="pb-12">
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root redirect */}
          <Route path="/" element={
            user
              ? <Navigate to={user.role==="recruiter" ? "/recruiter/dashboard" : "/jobs"} replace />
              : <Navigate to="/login" replace />
          } />

          {/* ── Seeker ─────────────────────────────────────────── */}
          <Route path="/jobs" element={
            <ProtectedRoute role="seeker"><JobList /></ProtectedRoute>
          } />
          <Route path="/applied" element={
            <ProtectedRoute role="seeker"><AppliedJobs /></ProtectedRoute>
          } />
          <Route path="/bookmarks" element={
            <ProtectedRoute role="seeker"><Bookmarks /></ProtectedRoute>
          } />
          <Route path="/resume" element={
            <ProtectedRoute role="seeker"><ResumePage /></ProtectedRoute>
          } />

          {/* ── Recruiter ───────────────────────────────────────── */}
          <Route path="/recruiter/dashboard" element={
            <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
          } />
          <Route path="/recruiter/post-job" element={
            <ProtectedRoute role="recruiter"><PostJob /></ProtectedRoute>
          } />
          <Route path="/recruiter/my-jobs" element={
            <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
          } />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4500,
          style: {
            borderRadius: "14px",
            fontSize: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          },
          success: { iconTheme: { primary:"#4f46e5", secondary:"#fff" } },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Shell />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
