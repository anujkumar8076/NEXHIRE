import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Zap, Bell, User, LogOut, BookmarkCheck, FileText,
  LayoutDashboard, PlusSquare, Briefcase, ChevronDown,
  Menu, X, Search,
} from "lucide-react";
import { useAuth }   from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import clsx from "clsx";

const SEEKER_LINKS = [
  { to: "/jobs",      icon: Search,        label: "Browse Jobs"  },
  { to: "/applied",   icon: FileText,      label: "Applied"      },
  { to: "/bookmarks", icon: BookmarkCheck, label: "Saved"        },
  { to: "/resume",    icon: Zap,           label: "My Resume"    },
];

const RECRUITER_LINKS = [
  { to: "/recruiter/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/recruiter/post-job",  icon: PlusSquare,      label: "Post Job"  },
  { to: "/recruiter/my-jobs",   icon: Briefcase,       label: "My Jobs"   },
];

export default function Navbar() {
  const { user, logout }             = useAuth();
  const { unreadCount, notifications, markRead } = useSocket() || {};
  const navigate   = useNavigate();
  const location   = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const profileRef = useRef(null);
  const notifRef   = useRef(null);

  // close dropdowns on outside click
  useEffect(() => {
    const fn = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
      if (!notifRef.current?.contains(e.target))   setNotifOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const links  = user?.role === "recruiter" ? RECRUITER_LINKS : SEEKER_LINKS;
  const isActive = (to) => location.pathname === to;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          to={user ? (user.role === "recruiter" ? "/recruiter/dashboard" : "/jobs") : "/"}
          className="flex items-center gap-2.5 shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">
            Nex<span className="text-indigo-600">Hire</span>
          </span>
        </Link>

        {/* Desktop nav */}
        {user && (
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map(({ to, icon: Icon, label }) => (
              <Link
                key={to} to={to}
                className={clsx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                  isActive(to)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              {/* Bell */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { setNotifOpen((p) => !p); markRead?.(); }}
                  className="relative p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {!notifications?.length ? (
                        <div className="py-10 text-center text-sm text-gray-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                          All caught up!
                        </div>
                      ) : notifications.slice(0, 12).map((n, i) => (
                        <div
                          key={i}
                          className={clsx("px-4 py-3 text-sm hover:bg-gray-50 transition-colors",
                            !n.isRead && "bg-indigo-50/40")}
                        >
                          <p className="text-gray-800 leading-snug">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : "Just now"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen((p) => !p)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-indigo-100 flex items-center justify-center">
                    {user.avatar
                      ? <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                      : <span className="text-xs font-bold text-indigo-600">{user.name?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[96px] truncate">
                    {user.name?.split(" ")[0]}
                  </span>
                  <ChevronDown className={clsx("w-3.5 h-3.5 text-gray-400 transition-transform",
                    profileOpen && "rotate-180")} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 py-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <span className={clsx("mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                        user.role === "recruiter"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-indigo-50 text-indigo-700"
                      )}>{user.role}</span>
                    </div>
                    <Link to="/profile"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User className="w-4 h-4 text-gray-400" /> Profile Settings
                    </Link>
                    <button
                      onClick={() => { logout(); navigate("/login"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu */}
              <button
                onClick={() => setMobileOpen((p) => !p)}
                className="md:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                Sign In
              </Link>
              <Link to="/register"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-indigo-200">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {user && mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
              className={clsx("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                isActive(to) ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50")}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
