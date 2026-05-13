import { useState, useCallback, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X, Loader2, Frown, Sparkles } from "lucide-react";
import api from "../utils/api";
import JobCard from "../components/JobCard";
import JobDetailsDrawer from "../components/JobDetailsDrawer";
import useInfiniteScroll from "../hooks/useInfiniteScroll";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

const TYPES    = ["full-time","part-time","contract","internship","freelance"];
const LOC_MODES= ["remote","onsite","hybrid"];
const EXP      = ["entry","mid","senior","lead","executive"];
const SORTS    = [{ v:"createdAt",l:"Newest" },{ v:"salary",l:"Highest Salary" },{ v:"applicants",l:"Most Applied" }];

const DEFAULT = { search:"",jobType:"",locationType:"",experienceLevel:"",
  salaryMin:"",salaryMax:"",skills:"",sortBy:"createdAt" };

export default function JobList() {
  const { user } = useAuth();
  const [jobs,    setJobs]    = useState([]);
  const [page,    setPage]    = useState({ hasNextPage:false, page:1, total:0 });
  const [loading, setLoading] = useState(false);
  const [init,    setInit]    = useState(true);
  const [filters, setFilters] = useState(DEFAULT);
  const [pending, setPending] = useState(DEFAULT);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selJob,  setSelJob]  = useState(null);
  const [drawer,  setDrawer]  = useState(false);
  const [bmIds,   setBmIds]   = useState(new Set());
  const [sugg,    setSugg]    = useState([]);
  const [showSugg,setShowSugg]= useState(false);
  const abort = useRef(null);

  const fetchJobs = useCallback(async (p=1, f=filters) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLoading(true);
    try {
      const q = new URLSearchParams({ page:p, limit:10, sortBy:f.sortBy });
      if (f.search)          q.set("search",          f.search);
      if (f.jobType)         q.set("jobType",         f.jobType);
      if (f.locationType)    q.set("locationType",    f.locationType);
      if (f.experienceLevel) q.set("experienceLevel", f.experienceLevel);
      if (f.salaryMin)       q.set("salaryMin",       f.salaryMin);
      if (f.salaryMax)       q.set("salaryMax",       f.salaryMax);
      if (f.skills)          q.set("skills",          f.skills);

      const { data } = await api.get(`/jobs?${q}`, { signal:ctrl.signal });
      setJobs((prev) => p===1 ? data.jobs : [...prev, ...data.jobs]);
      setPage(data.pagination);
    } catch (e) {
      if (e.name !== "CanceledError" && e.code !== "ERR_CANCELED") console.error(e);
    } finally { setLoading(false); setInit(false); }
  }, [filters]);

  const fetchBm = useCallback(async () => {
    if (user?.role !== "seeker") return;
    try {
      const { data } = await api.get("/bookmarks?limit=200");
      setBmIds(new Set(data.bookmarks.map((b) => b.job?._id).filter(Boolean)));
    } catch { /* silent */ }
  }, [user]);

  const fetchSugg = useCallback(async () => {
    if (user?.role !== "seeker") return;
    try {
      const { data } = await api.get("/resume/suggested-jobs");
      if (data.jobs?.length) { setSugg(data.jobs); setShowSugg(true); }
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => { fetchJobs(1); fetchBm(); fetchSugg(); }, []); // eslint-disable-line

  const loadMore = useCallback(() => {
    if (!loading && page.hasNextPage) fetchJobs(page.page+1);
  }, [loading, page, fetchJobs]);

  const sentinel = useInfiniteScroll(loadMore, page.hasNextPage, loading);

  const applyFilters = () => {
    setFilters(pending); setPanelOpen(false); setInit(true);
    fetchJobs(1, pending);
  };

  const reset = () => {
    setPending(DEFAULT); setFilters(DEFAULT); setPanelOpen(false);
    fetchJobs(1, DEFAULT);
  };

  const activeCount = Object.entries(filters)
    .filter(([k,v]) => k!=="sortBy" && v && v!==DEFAULT[k]).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key==="Enter") {
                const n = { ...filters, search:e.target.value };
                setFilters(n); setPending(n); fetchJobs(1,n);
              }
            }}
            placeholder="Search jobs, companies, skills…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <select value={filters.sortBy}
          onChange={(e) => { const n={...filters,sortBy:e.target.value}; setFilters(n); fetchJobs(1,n); }}
          className="px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          {SORTS.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => setPanelOpen(p=>!p)}
          className={clsx("flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border transition-all shadow-sm",
            panelOpen||activeCount>0
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300")}>
          <SlidersHorizontal className="w-4 h-4" />Filters
          {activeCount>0 && (
            <span className="bg-white text-indigo-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {panelOpen && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[{ label:"Job Type", key:"jobType", opts:TYPES },
              { label:"Work Mode", key:"locationType", opts:LOC_MODES },
              { label:"Experience", key:"experienceLevel", opts:EXP },
            ].map(({ label, key, opts }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {opts.map((o) => (
                    <button key={o} type="button"
                      onClick={() => setPending(p=>({...p,[key]:p[key]===o?"":o}))}
                      className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-all",
                        pending[key]===o ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300")}>
                      {o.replace("-"," ")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Salary (USD)</p>
              <div className="flex items-center gap-2">
                {["salaryMin","salaryMax"].map((k,i) => (
                  <input key={k} type="number" placeholder={i===0?"Min":"Max"}
                    value={pending[k]} onChange={(e)=>setPending(p=>({...p,[k]:e.target.value}))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
              <input placeholder="React, Python…" value={pending.skills}
                onChange={(e)=>setPending(p=>({...p,skills:e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button onClick={reset} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Reset</button>
            <button onClick={applyFilters} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Apply</button>
          </div>
        </div>
      )}

      {/* Active filter badges */}
      {activeCount>0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {["jobType","locationType","experienceLevel","skills"].map((k) =>
            filters[k] ? (
              <span key={k} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full border border-indigo-100">
                {filters[k]}
                <button onClick={() => { const n={...filters,[k]:""}; setFilters(n); fetchJobs(1,n); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null
          )}
        </div>
      )}

      {/* AI suggestions */}
      {showSugg && sugg.length>0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />Recommended for You
            </h2>
            <button onClick={()=>setShowSugg(false)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sugg.slice(0,3).map((j) => (
              <JobCard key={j._id} job={j} onClick={(j)=>{setSelJob(j);setDrawer(true);}}
                isSelected={selJob?._id===j._id} matchScore={j.matchScore}
                initialBookmarked={bmIds.has(j._id)}
                onBookmarkChange={(id,s)=>setBmIds(p=>{const n=new Set(p);s?n.add(id):n.delete(id);return n;})} />
            ))}
          </div>
          <div className="my-6 border-t border-gray-100" />
        </section>
      )}

      {/* Results count */}
      {!init && (
        <div className="flex justify-between text-sm text-gray-400 mb-4">
          <span>{page.total.toLocaleString()} job{page.total!==1?"s":""} found</span>
          <span>Showing {jobs.length}</span>
        </div>
      )}

      {/* Grid */}
      {init && loading
        ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-48">
                <div className="flex gap-3 mb-4"><div className="w-12 h-12 bg-gray-100 rounded-2xl"/><div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4"/><div className="h-3 bg-gray-100 rounded w-1/2"/></div></div>
                <div className="space-y-2"><div className="h-3 bg-gray-100 rounded"/><div className="h-3 bg-gray-100 rounded w-5/6"/></div>
              </div>
            ))}
          </div>
        : jobs.length===0
          ? <div className="flex flex-col items-center justify-center py-24 text-center">
              <Frown className="w-12 h-12 text-gray-200 mb-4"/>
              <h3 className="text-lg font-semibold text-gray-700">No jobs found</h3>
              <p className="text-sm text-gray-400 mt-1 mb-4">Try adjusting your search or filters.</p>
              <button onClick={reset} className="text-sm text-indigo-600 hover:underline">Clear filters</button>
            </div>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((j) => (
                <JobCard key={j._id} job={j}
                  onClick={(j)=>{setSelJob(j);setDrawer(true);}}
                  isSelected={selJob?._id===j._id}
                  initialBookmarked={bmIds.has(j._id)}
                  onBookmarkChange={(id,s)=>setBmIds(p=>{const n=new Set(p);s?n.add(id):n.delete(id);return n;})} />
              ))}
            </div>
      }

      {/* Sentinel */}
      <div ref={sentinel} className="h-10 flex items-center justify-center mt-6">
        {loading && !init && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin"/>}
        {!loading && !page.hasNextPage && jobs.length>0 && (
          <p className="text-xs text-gray-400">All {page.total} jobs loaded.</p>
        )}
      </div>

      <JobDetailsDrawer job={selJob} isOpen={drawer}
        onClose={() => { setDrawer(false); setTimeout(()=>setSelJob(null),300); }}
        onApply={(id) => setJobs(p=>p.map(j=>j._id===id?{...j,applicantCount:(j.applicantCount||0)+1}:j))} />
    </div>
  );
}
