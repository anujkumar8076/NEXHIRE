import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const { state }  = useLocation();
  const [form, setForm] = useState({ email:"", password:"" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role==="recruiter" ? "/recruiter/dashboard" : (state?.from || "/jobs"), { replace:true });
    } catch (e) { setErr(e?.error || "Invalid email or password."); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl items-center justify-center shadow-xl shadow-indigo-200 mb-4">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your NexHire account</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-100 p-8">
          {err && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              {err}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
              <input type="email" required autoComplete="email"
                value={form.email} onChange={(e) => setForm(p=>({...p,email:e.target.value}))}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button type="button" className="text-xs text-indigo-600 hover:underline">Forgot?</button>
              </div>
              <div className="relative">
                <input type={show?"text":"password"} required autoComplete="current-password"
                  value={form.password} onChange={(e) => setForm(p=>({...p,password:e.target.value}))}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button type="button" onClick={()=>setShow(p=>!p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-md shadow-indigo-200">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          New to NexHire?{" "}
          <Link to="/register" className="text-indigo-600 font-semibold hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
