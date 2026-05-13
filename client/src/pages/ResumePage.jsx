import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import api from "../utils/api";
import ResumeBuilder from "../components/ResumeBuilder";

export default function ResumePage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/resume/me")
      .then(({ data }) => setData(data.resume))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-500"/>
      <span className="text-sm">Loading your resume…</span>
    </div>
  );

  return <ResumeBuilder initialData={data} />;
}
