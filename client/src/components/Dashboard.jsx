import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, Users, CheckCircle, XCircle, Clock, TrendingUp,
  Eye, MessageSquare, RefreshCw, Plus, ChevronRight,
  Award, BarChart3, Search, Calendar, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import clsx from "clsx";

const SC = {
  applied:      { label:"Applied",      icon:Clock,         bg:"bg-blue-500",    light:"bg-blue-50 text-blue-700",    dot:"bg-blue-400" },
  reviewing:    { label:"Reviewing",    icon:Eye,           bg:"bg-amber-500",   light:"bg-amber-50 text-amber-700",  dot:"bg-amber-400" },
  interviewing: { label:"Interviewing", icon:MessageSquare, bg:"bg-purple-500",  light:"bg-purple-50 text-purple-700",dot:"bg-purple-400" },
  hired:        { label:"Hired",        icon:CheckCircle,   bg:"bg-emerald-500", light:"bg-emerald-50 text-emerald-700",dot:"bg-emerald-400" },
  rejected:     { label:"Rejected",     icon:XCircle,       bg:"bg-red-400",     light:"bg-red-50 text-red-600",      dot:"bg-red-400" },
};

function StatCard({ label, value, icon: Icon, gradient }) {
  return (
    <div className={clsx("rounded-2xl p-5 text-white", gradient)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-extrabold">{value ?? "—"}</p>
          <p className="text-sm text-white/80 mt-1">{label}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ApplicantRow({ app = {}, onStatusChange  }) {
  const [status, setStatus] = useState(app?.status || "applied");
  const [busy,   setBusy]   = useState(false);
  const cfg = SC[status] || SC.applied;
  const Icon = cfg.icon;

  const update = async (s) => {
    setBusy(true);
    try {
      await api.patch(`/applications/${app._id}/status`, { status: s });
      setStatus(s);
      onStatusChange?.(app._id, s);
    } catch { /* silent */ }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 rounded-xl transition-colors group">
      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
        {app.applicant?.avatar
          ? <img src={app.applicant.avatar} className="w-full h-full object-cover" alt="" />
          : <span className="text-xs font-bold text-indigo-600">{app.applicant?.name?.[0]?.toUpperCase()}</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{app.applicant?.name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="truncate">{app.job?.title}</span>
          {app.matchScore > 0 && (
            <span className="flex items-center gap-0.5 text-indigo-500 font-medium shrink-0">
              <Zap className="w-3 h-3" />{app.matchScore}%
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={clsx("hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full", cfg.light)}>
          <Icon className="w-3 h-3" />{cfg.label}
        </span>
        <select value={status} onChange={(e) => update(e.target.value)}
          disabled={busy || ["hired","rejected"].includes(status)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-40 cursor-pointer">
          {Object.entries(SC).map(([v,{ label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function RecruiterDashboard() {
  const { socket }   = useSocket() || {};
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("overview");
  const [applicants, setApplicants] = useState([]);
  const [selJob,     setSelJob]     = useState(null);
  const [search,     setSearch]     = useState("");
  const [sfilt,      setSfilt]      = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/jobs/recruiter/dashboard");
      setData(d);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on("notification:new", (p) => { if (p.type === "new_application") load(); });
    return () => socket.off("notification:new");
  }, [socket, load]);

  const loadApplicants = async (job) => {
    setSelJob(job); setTab("applicants");
    try {
      const { data: d } = await api.get(`/applications/job/${job._id}?limit=100`);
      setApplicants(d.applications);
    } catch { /* silent */ }
  };

  const filtered = applicants.filter((a) =>
    (!search || a.applicant?.name?.toLowerCase().includes(search.toLowerCase())) &&
    (!sfilt  || a.status === sfilt)
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
      <span className="text-sm">Loading dashboard…</span>
    </div>
  );

  const { stats={}, recentApplications=[], recentJobs=[] } = data || {};
  const total = stats.totalApplications || 1;
  const pipeline = Object.entries(SC).map(([key, cfg]) => ({
    key, ...cfg, count: stats[key]||0, pct: Math.round(((stats[key]||0)/total)*100),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Recruiter Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage jobs and track every applicant.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/recruiter/post-job"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-md shadow-indigo-200">
            <Plus className="w-4 h-4" />Post Job
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Jobs"      value={stats.totalJobs}         icon={Briefcase} gradient="bg-gradient-to-br from-indigo-500 to-violet-600" />
        <StatCard label="Active Jobs"     value={stats.activeJobs}        icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard label="Total Applicants"value={stats.totalApplications} icon={Users}     gradient="bg-gradient-to-br from-sky-500 to-indigo-600" />
        <StatCard label="Hired"           value={stats.hired}             icon={Award}     gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        {[
          { id:"overview",   label:"Overview",   icon:BarChart3 },
          { id:"jobs",       label:"My Jobs",    icon:Briefcase },
          { id:"applicants", label: selJob ? `${selJob.title.slice(0,18)}…` : "Applicants", icon:Users },
        ].map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              tab === id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-indigo-500" />Application Pipeline
            </h2>
            <div className="space-y-4">
              {pipeline.map(({ key, label, bg, count, pct }) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold text-gray-900">{count} <span className="font-normal text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full transition-all duration-700", bg)}
                      style={{ width:`${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Applicants</h2>
            {!recentApplications.length
              ? <p className="text-sm text-gray-400 text-center py-8">No applicants yet.</p>
              : <div className="space-y-1">
                  {recentApplications.map((a) => <ApplicantRow key={a._id} app={a} />)}
                </div>
            }
          </div>
        </div>
      )}

      {/* ── My Jobs ───────────────────────────────────────────────────── */}
      {tab === "jobs" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Posted Jobs</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {!recentJobs.length
              ? <div className="py-16 text-center">
                  <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-2">No jobs posted yet.</p>
                  <Link to="/recruiter/post-job" className="text-indigo-600 text-sm hover:underline">Post your first job →</Link>
                </div>
              : recentJobs.map((job) => (
                <div key={job._id} onClick={() => loadApplicants(job)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium",
                        job.status==="active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                        {job.status}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{new Date(job.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-400">{job.location}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-extrabold text-gray-900">{job.applicantCount||0}</p>
                    <p className="text-xs text-gray-400">applicants</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Applicants ────────────────────────────────────────────────── */}
      {tab === "applicants" && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <select value={sfilt} onChange={(e) => setSfilt(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All Statuses</option>
              {Object.entries(SC).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
            </select>
            {selJob && <span className="text-sm text-gray-500">— <strong>{selJob.title}</strong></span>}
          </div>

          <div className="p-3">
            {!selJob
              ? <p className="text-sm text-gray-400 text-center py-10">Select a job from "My Jobs" tab.</p>
              : !filtered.length
                ? <div className="py-12 text-center">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No applicants match your filter.</p>
                  </div>
                : filtered.map((a) => (
                    <ApplicantRow key={a._id} app={a}
                      onStatusChange={(id, s) =>
                        setApplicants((p) => p.map((x) => x._id===id ? {...x, status:s} : x))} />
                  ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
