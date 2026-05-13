import { useState, useEffect, useCallback } from "react";
import {
  X, MapPin, Briefcase, DollarSign, Clock, Users, Building2,
  CheckCircle2, ChevronRight, Bookmark, BookmarkCheck,
  Zap, AlertCircle, Globe, Laptop, Building,
} from "lucide-react";
import api  from "../utils/api";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

const LOC_ICONS  = { remote: Globe, hybrid: Laptop, onsite: Building };
const EXP_LABELS = { entry:"Entry Level", mid:"Mid Level", senior:"Senior", lead:"Lead", executive:"Executive" };
const STATUS_PILL = {
  applied:"bg-blue-100 text-blue-700", reviewing:"bg-amber-100 text-amber-700",
  interviewing:"bg-purple-100 text-purple-700", hired:"bg-emerald-100 text-emerald-700",
  rejected:"bg-red-100 text-red-700",
};

export default function JobDetailsDrawer({ job, isOpen, onClose, onApply }) {
  const { user } = useAuth();
  const [applying,   setApplying]   = useState(false);
  const [applied,    setApplied]    = useState(false);
  const [appStatus,  setAppStatus]  = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [match,      setMatch]      = useState(null);
  const [matchBusy,  setMatchBusy]  = useState(false);
  const [cover,      setCover]      = useState("");
  const [showCover,  setShowCover]  = useState(false);
  const [error,      setError]      = useState("");

  const isSeeker = user?.role === "seeker";

  const checkStatus = useCallback(async () => {
    if (!job || !isSeeker) return;
    try {
      const [{ data: a }, { data: b }] = await Promise.all([
        api.get("/applications/my?limit=200"),
        api.get(`/bookmarks/check/${job._id}`),
      ]);
      const found = a.applications?.find((ap) => ap.job?._id === job._id);
      if (found) { setApplied(true); setAppStatus(found.status); }
      setBookmarked(b.bookmarked);
    } catch { /* silent */ }
  }, [job, isSeeker]);

  const fetchMatch = useCallback(async () => {
    if (!job || !isSeeker) return;
    setMatchBusy(true);
    try { const { data } = await api.post(`/resume/match/${job._id}`); setMatch(data); }
    catch { setMatch(null); }
    finally { setMatchBusy(false); }
  }, [job, isSeeker]);

  useEffect(() => {
    if (isOpen && job) {
      setError(""); setShowCover(false); setCover("");
      checkStatus(); fetchMatch();
    }
  }, [isOpen, job]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  const handleApply = async () => {
    setError(""); setApplying(true);
    try {
      await api.post("/applications", { jobId: job._id, coverLetter: cover });
      setApplied(true); setAppStatus("applied"); setShowCover(false); onApply?.(job._id);
    } catch (e) { setError(e?.error || "Failed to apply. Try again."); }
    finally { setApplying(false); }
  };

  const toggleBm = async () => {
    if (!isSeeker) return;
    try {
      if (bookmarked) { await api.delete(`/bookmarks/${job._id}`); setBookmarked(false); }
      else            { await api.post(`/bookmarks/${job._id}`);   setBookmarked(true);  }
    } catch { /* silent */ }
  };

  if (!job) return null;

  const LocIcon = LOC_ICONS[job.locationType] || Building;
  const salaryStr = job.salary?.isVisible && (job.salary.min || job.salary.max)
    ? `$${Math.round(job.salary.min/1000)}k – $${Math.round(job.salary.max/1000)}k / ${job.salary.period}`
    : null;

  return (
    <>
      <div onClick={onClose}
        className={clsx("fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none")} />

      <aside
        role="dialog" aria-modal="true" aria-label="Job details"
        className={clsx("fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full")}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
              {job.companyLogo || job.postedBy?.companyLogo
                ? <img src={job.companyLogo || job.postedBy?.companyLogo} className="w-full h-full object-cover" alt="" />
                : <span className="text-2xl font-black text-indigo-600">{(job.company||"?")[0].toUpperCase()}</span>
              }
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{job.title}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />{job.company || job.postedBy?.company}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isSeeker && (
              <button onClick={toggleBm}
                className={clsx("p-2 rounded-xl transition-colors",
                  bookmarked ? "text-indigo-600 bg-indigo-50" : "text-gray-300 hover:text-indigo-500 hover:bg-indigo-50")}>
                {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </button>
            )}
            <button onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* AI Match */}
          {isSeeker && (
            <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" /> AI Resume Match
                </span>
                {match && (
                  <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full",
                    match.score>=75?"bg-emerald-100 text-emerald-700":
                    match.score>=50?"bg-indigo-100 text-indigo-700":
                    match.score>=30?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-600")}>
                    {match.verdict}
                  </span>
                )}
              </div>
              {matchBusy
                ? <div className="h-2 bg-indigo-100 rounded-full animate-pulse" />
                : match ? (
                  <>
                    <div className="h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${match.score}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-indigo-600 mt-1.5">
                      <span>{match.matchedKeywords?.length || 0} / {match.totalJobKeywords} keywords matched</span>
                      <span className="font-bold">{match.score}%</span>
                    </div>
                    {match.missingKeywords?.length > 0 && (
                      <p className="text-xs text-indigo-500 mt-1.5">
                        Missing: {match.missingKeywords.slice(0,5).join(", ")}
                        {match.missingKeywords.length > 5 && ` +${match.missingKeywords.length-5} more`}
                      </p>
                    )}
                  </>
                ) : <p className="text-xs text-indigo-500">Build your resume to see your match score.</p>
              }
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: MapPin,    label: job.location },
              { icon: LocIcon,   label: job.locationType },
              { icon: Briefcase, label: job.jobType?.replace("-"," ") },
              { icon: Clock,     label: EXP_LABELS[job.experienceLevel] || job.experienceLevel },
              ...(salaryStr ? [{ icon: DollarSign, label: salaryStr }] : []),
              { icon: Users, label: `${job.applicantCount||0} applicants` },
            ].map(({ icon: Ic, label }, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <Ic className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-sm text-gray-700 capitalize truncate">{label}</span>
              </div>
            ))}
          </div>

          {/* Skills */}
          {job.skills?.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((sk) => {
                  const hit = match?.matchedKeywords?.includes(sk.toLowerCase());
                  return (
                    <span key={sk} className={clsx("text-xs font-medium px-3 py-1 rounded-full border",
                      hit ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200")}>
                      {hit && <CheckCircle2 className="w-3 h-3 inline mr-1" />}{sk}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* Description */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">About the Role</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
          </section>

          {/* Requirements */}
          {job.requirements?.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Requirements</h3>
              <ul className="space-y-2">
                {job.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />{r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Cover letter */}
          {showCover && (
            <section>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Cover Letter <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea value={cover} onChange={(e) => setCover(e.target.value)}
                rows={5} maxLength={2000}
                placeholder="Tell the recruiter why you're a great fit…"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-gray-400 text-right mt-1">{cover.length}/2000</p>
            </section>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-xl p-3 border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-5 border-t border-gray-100 shrink-0 bg-white">
          {!isSeeker ? (
            <p className="text-center text-sm text-gray-400">Sign in as a job seeker to apply.</p>
          ) : applied ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Application submitted</span>
              </div>
              {appStatus && (
                <span className={clsx("text-xs font-semibold px-3 py-1 rounded-full capitalize",
                  STATUS_PILL[appStatus])}>{appStatus}</span>
              )}
            </div>
          ) : showCover ? (
            <div className="flex gap-2">
              <button onClick={() => setShowCover(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button onClick={handleApply} disabled={applying}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {applying ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowCover(true)}
                className="flex-1 py-3 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors">
                Add Cover Letter
              </button>
              <button onClick={handleApply} disabled={applying}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {applying ? "Applying…" : "Quick Apply ⚡"}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
