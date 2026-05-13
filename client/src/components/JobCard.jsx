import { useState, memo } from "react";
import { MapPin, Clock, Briefcase, Users, Bookmark, BookmarkCheck, Zap, Building2, DollarSign } from "lucide-react";
import api  from "../utils/api";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

const TYPE_PILL = {
  "full-time":  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "part-time":  "bg-sky-50 text-sky-700 border-sky-200",
  "contract":   "bg-amber-50 text-amber-700 border-amber-200",
  "internship": "bg-purple-50 text-purple-700 border-purple-200",
  "freelance":  "bg-rose-50 text-rose-700 border-rose-200",
};

const LOC_LABEL = { remote:"🌐 Remote", onsite:"🏢 On-site", hybrid:"🔄 Hybrid" };

const scoreColor = (s) =>
  s >= 75 ? "bg-emerald-500" :
  s >= 50 ? "bg-indigo-500"  :
  s >= 30 ? "bg-amber-400"   : "bg-gray-300";

const fmtSalary = (sal) => {
  if (!sal?.isVisible || (!sal.min && !sal.max)) return null;
  const k = (n) => n >= 1000 ? `${Math.round(n/1000)}k` : `${n}`;
  const sym = sal.currency === "USD" ? "$" : sal.currency;
  if (sal.min && sal.max) return `${sym}${k(sal.min)}–${sym}${k(sal.max)}`;
  return sal.max ? `Up to ${sym}${k(sal.max)}` : `From ${sym}${k(sal.min)}`;
};

const ago = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days/7)}w ago`;
  return `${Math.floor(days/30)}mo ago`;
};

const JobCard = memo(({ job, onClick, isSelected=false, matchScore=null,
  initialBookmarked=false, onBookmarkChange }) => {
  const { user } = useAuth();
  const [bm, setBm]   = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const isSeeker = user?.role === "seeker";

  const toggleBm = async (e) => {
    e.stopPropagation();
    if (!isSeeker) return;
    setBusy(true);
    try {
      if (bm) { await api.delete(`/bookmarks/${job._id}`); setBm(false); onBookmarkChange?.(job._id, false); }
      else    { await api.post(`/bookmarks/${job._id}`);   setBm(true);  onBookmarkChange?.(job._id, true);  }
    } catch { /* silent */ }
    finally { setBusy(false); }
  };

  const salary  = fmtSalary(job.salary);
  const company = job.company || job.postedBy?.company || "";
  const logo    = job.companyLogo || job.postedBy?.companyLogo;

  return (
    <article
      onClick={() => onClick?.(job)}
      className={clsx(
        "relative bg-white rounded-2xl border p-5 cursor-pointer group transition-all duration-200",
        "hover:shadow-xl hover:-translate-y-0.5",
        isSelected
          ? "border-indigo-400 shadow-lg ring-2 ring-indigo-400/20"
          : "border-gray-100 hover:border-indigo-200"
      )}
    >
      {/* Match badge */}
      {matchScore !== null && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-2.5 py-1 shadow-sm text-xs font-medium text-gray-700">
          <Zap className="w-3 h-3 text-indigo-500" />
          <div className={clsx("w-1.5 h-1.5 rounded-full", scoreColor(matchScore))} />
          {matchScore}% match
        </div>
      )}

      {/* Bookmark */}
      {isSeeker && (
        <button
          onClick={toggleBm}
          disabled={busy}
          className={clsx("absolute top-3 right-3 p-1.5 rounded-xl transition-all",
            bm ? "text-indigo-600 bg-indigo-50" : "text-gray-300 hover:text-indigo-500 hover:bg-indigo-50")}
        >
          {bm ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      )}

      {/* Header */}
      <div className={clsx("flex items-start gap-3 mb-4", matchScore !== null && "mt-6")}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
          {logo
            ? <img src={logo} className="w-full h-full object-cover rounded-2xl" alt="" />
            : <span className="text-xl font-black text-indigo-600">{company[0]?.toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-gray-900 text-[15px] leading-snug truncate group-hover:text-indigo-700 transition-colors">
            {job.title}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-gray-400 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate">{company}</span>
          </div>
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-full border capitalize flex items-center gap-1",
          TYPE_PILL[job.jobType] || "bg-gray-50 text-gray-600 border-gray-200")}>
          <Briefcase className="w-3 h-3" />{job.jobType?.replace("-"," ")}
        </span>
        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
          {LOC_LABEL[job.locationType] || "🏢 On-site"}
        </span>
        {salary && (
          <span className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 flex items-center gap-0.5">
            <DollarSign className="w-3 h-3" />{salary}
          </span>
        )}
      </div>

      {/* Location / stats */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1 truncate max-w-[150px]">
          <MapPin className="w-3.5 h-3.5 shrink-0" />{job.location}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{job.applicantCount||0}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ago(job.createdAt)}</span>
        </div>
      </div>

      {/* Skills */}
      {job.skills?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1.5">
          {job.skills.slice(0,4).map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium">{s}</span>
          ))}
          {job.skills.length > 4 && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg">+{job.skills.length-4}</span>
          )}
        </div>
      )}
    </article>
  );
});

JobCard.displayName = "JobCard";
export default JobCard;
