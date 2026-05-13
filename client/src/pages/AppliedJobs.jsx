import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase, Clock, CheckCircle, XCircle, Eye, MessageSquare,
  FileText, ChevronRight, TrendingUp, Loader2,
} from "lucide-react";
import api  from "../utils/api";
import clsx from "clsx";

const SC = {
  applied:      { label:"Applied",      icon:Clock,         bg:"bg-blue-50",    text:"text-blue-700",    dot:"bg-blue-400" },
  reviewing:    { label:"Reviewing",    icon:Eye,           bg:"bg-amber-50",   text:"text-amber-700",   dot:"bg-amber-400" },
  interviewing: { label:"Interviewing", icon:MessageSquare, bg:"bg-purple-50",  text:"text-purple-700",  dot:"bg-purple-400" },
  hired:        { label:"Hired 🎉",     icon:CheckCircle,   bg:"bg-emerald-50", text:"text-emerald-700", dot:"bg-emerald-500" },
  rejected:     { label:"Not Selected", icon:XCircle,       bg:"bg-red-50",     text:"text-red-600",     dot:"bg-red-400" },
};

const FILTERS = ["all","applied","reviewing","interviewing","hired","rejected"];

export default function AppliedJobs() {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total,   setTotal]   = useState(0);

  const fetchApps = async (p=1, f=filter) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page:p, limit:8 });
      if (f !== "all") q.set("status", f);
      const { data } = await api.get(`/applications/my?${q}`);
      setApps((prev) => p===1 ? data.applications : [...prev, ...data.applications]);
      setHasMore(data.pagination.hasNextPage);
      setTotal(data.pagination.total);
      setPage(p);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApps(1, filter); }, [filter]);

  const withdraw = async (id) => {
    if (!window.confirm("Withdraw this application?")) return;
    try {
      await api.delete(`/applications/${id}`);
      setApps((p) => p.filter((a) => a._id !== id));
      setTotal((t) => t - 1);
    } catch { /* silent */ }
  };

  // Quick counts from loaded apps
  const counts = apps.reduce((acc, a) => ({ ...acc, [a.status]:(acc[a.status]||0)+1 }), {});

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">My Applications</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total application{total!==1?"s":""}</p>
      </div>

      {/* Summary bar */}
      {!loading && apps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {["applied","reviewing","interviewing","hired"].map((s) => {
            const c = SC[s]; const Icon = c.icon;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={clsx("p-3.5 rounded-2xl border text-left transition-all hover:shadow-md",
                  filter===s ? `${c.bg} border-current shadow-sm` : "bg-white border-gray-100")}>
                <Icon className={clsx("w-5 h-5 mb-2", c.text)} />
                <p className="text-2xl font-extrabold text-gray-900">{counts[s]||0}</p>
                <p className={clsx("text-xs font-semibold mt-0.5", c.text)}>{c.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx("shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all capitalize",
              filter===f ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800")}>
            {f==="all" ? "All" : SC[f]?.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && page===1
        ? <div className="space-y-3">
            {Array.from({length:4}).map((_,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl shrink-0"/>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/2"/>
                    <div className="h-3 bg-gray-100 rounded w-1/3"/>
                    <div className="h-3 bg-gray-100 rounded w-1/4"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        : apps.length===0
          ? <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No applications yet</h3>
              <p className="text-sm text-gray-400 mb-5">
                {filter==="all" ? "Start applying to jobs to track them here." : `No ${filter} applications.`}
              </p>
              <Link to="/jobs"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-md shadow-indigo-200">
                <Briefcase className="w-4 h-4" />Browse Jobs
              </Link>
            </div>
          : <div className="space-y-3">
              {apps.map((app) => {
                if (!app.job) return null;
                const c = SC[app.status] || SC.applied;
                const Icon = c.icon;
                const job  = app.job;
                return (
                  <div key={app._id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {job.companyLogo
                          ? <img src={job.companyLogo} className="w-full h-full object-cover" alt="" />
                          : <span className="font-extrabold text-indigo-600 text-lg">{(job.company||"?")[0].toUpperCase()}</span>
                        }
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                            <p className="text-sm text-gray-500">{job.company} · {job.location}</p>
                          </div>
                          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0",
                            c.bg, c.text)}>
                            <Icon className="w-3.5 h-3.5" />{c.label}
                          </span>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5"/>Applied {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                          {app.matchScore > 0 && (
                            <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5"/>{app.matchScore}% match
                            </span>
                          )}
                          {job.jobType && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                              {job.jobType.replace("-"," ")}
                            </span>
                          )}
                        </div>

                        {/* Status timeline */}
                        {app.statusHistory?.length > 1 && (
                          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                            {app.statusHistory.map((sh, i) => {
                              const sc = SC[sh.status];
                              return (
                                <div key={i} className="flex items-center gap-1.5 shrink-0">
                                  <div className={clsx("w-2 h-2 rounded-full", sc?.dot||"bg-gray-300")}/>
                                  <span className="text-xs text-gray-500 capitalize">{sh.status}</span>
                                  {i < app.statusHistory.length-1 && <ChevronRight className="w-3 h-3 text-gray-300"/>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      {job.status==="active"
                        ? <Link to={`/jobs`} className="text-xs text-indigo-600 hover:underline font-medium">View Job →</Link>
                        : <span className="text-xs text-gray-400">Job closed</span>
                      }
                      {!["hired","rejected"].includes(app.status) && (
                        <button onClick={() => withdraw(app._id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium">
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <button onClick={() => fetchApps(page+1)} disabled={loading}
                  className="w-full py-3 border border-gray-200 rounded-2xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Load More"}
                </button>
              )}
            </div>
      }
    </div>
  );
}
