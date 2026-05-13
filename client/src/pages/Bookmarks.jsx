import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookmarkCheck, Bookmark, Briefcase, Loader2 } from "lucide-react";
import api from "../utils/api";
import JobCard from "../components/JobCard";
import JobDetailsDrawer from "../components/JobDetailsDrawer";

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selJob,    setSelJob]    = useState(null);
  const [drawer,    setDrawer]    = useState(false);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(false);
  const [total,     setTotal]     = useState(0);

  const fetch = async (p=1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/bookmarks?page=${p}&limit=9`);
      setBookmarks((prev) => p===1 ? data.bookmarks : [...prev, ...data.bookmarks]);
      setHasMore(data.pagination.page < data.pagination.totalPages);
      setTotal(data.pagination.total);
      setPage(p);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(1); }, []);

  const remove = async (jobId) => {
    try {
      await api.delete(`/bookmarks/${jobId}`);
      setBookmarks((p) => p.filter((b) => b.job?._id !== jobId));
      setTotal((t) => t - 1);
    } catch { /* silent */ }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <BookmarkCheck className="w-6 h-6 text-indigo-500" />Saved Jobs
        </h1>
        <p className="text-sm text-gray-500 mt-1">{total} job{total!==1?"s":""} saved</p>
      </div>

      {loading && page===1
        ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-48">
                <div className="flex gap-3 mb-4"><div className="w-12 h-12 bg-gray-100 rounded-2xl"/><div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4"/><div className="h-3 bg-gray-100 rounded w-1/2"/></div></div>
                <div className="space-y-2"><div className="h-3 bg-gray-100 rounded"/><div className="h-3 bg-gray-100 rounded w-4/5"/></div>
              </div>
            ))}
          </div>
        : bookmarks.length===0
          ? <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bookmark className="w-8 h-8 text-gray-300"/>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No saved jobs</h3>
              <p className="text-sm text-gray-400 mb-5">Bookmark jobs while browsing to revisit them later.</p>
              <Link to="/jobs"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-md shadow-indigo-200">
                <Briefcase className="w-4 h-4"/>Browse Jobs
              </Link>
            </div>
          : <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookmarks.map(({ job, _id }) => {
                  if (!job) return null;
                  return (
                    <JobCard key={_id} job={job}
                      onClick={(j) => { setSelJob(j); setDrawer(true); }}
                      isSelected={selJob?._id===job._id}
                      initialBookmarked={true}
                      onBookmarkChange={(id, state) => { if (!state) remove(id); }} />
                  );
                })}
              </div>

              {hasMore && (
                <div className="mt-6 text-center">
                  <button onClick={() => fetch(page+1)} disabled={loading}
                    className="px-6 py-3 border border-gray-200 rounded-2xl text-sm text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Load More"}
                  </button>
                </div>
              )}
            </>
      }

      <JobDetailsDrawer job={selJob} isOpen={drawer}
        onClose={() => { setDrawer(false); setTimeout(()=>setSelJob(null),300); }} />
    </div>
  );
}
