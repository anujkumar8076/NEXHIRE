import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Zap, UserCircle2, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:"",email:"",password:"",role:"seeker",company:"",inviteCode:"" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const user = await register(form);
      navigate(user.role==="recruiter" ? "/recruiter/dashboard" : "/jobs", { replace:true });
    } catch (e) { setErr(e?.error || "Registration failed."); }
    finally { setBusy(false); }
  };

  const strength = form.password.length >= 10 ? 3 : form.password.length >= 6 ? 2 : form.password.length > 0 ? 1 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl items-center justify-center shadow-xl shadow-indigo-200 mb-4">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Join NexHire</h1>
          <p className="text-sm text-gray-500 mt-1">Your next opportunity starts here</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-100 p-8">
          {/* Role picker */}
          <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-gray-100 rounded-2xl">
            {[{ v:"seeker",icon:UserCircle2,label:"Job Seeker" },{ v:"recruiter",icon:Building2,label:"Recruiter" }]
              .map(({ v, icon:Icon, label }) => (
              <button key={v} type="button" onClick={() => setForm(p=>({...p,role:v}))}
                className={clsx("flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                  form.role===v ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800")}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          {err && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{err}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
              <input required value={form.name} onChange={upd("name")} placeholder="Jane Doe"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            {form.role==="recruiter" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company</label>
                <input value={form.company} onChange={upd("company")} placeholder="Acme Corp"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
              <input type="email" required autoComplete="email" value={form.email} onChange={upd("email")}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
              <div className="relative">
                <input type={show?"text":"password"} required autoComplete="new-password"
                  value={form.password} onChange={upd("password")} placeholder="Min. 6 characters"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button type="button" onClick={()=>setShow(p=>!p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1,2,3].map((l) => (
                    <div key={l} className={clsx("flex-1 h-1 rounded-full transition-colors",
                      strength>=l
                        ? l===1?"bg-red-400":l===2?"bg-amber-400":"bg-emerald-400"
                        : "bg-gray-200")} />
                  ))}
                </div>
              )}
            </div>

            {form.role==="recruiter" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Invite Code <span className="text-gray-400 font-normal text-xs">(if required)</span>
                </label>
                <input value={form.inviteCode} onChange={upd("inviteCode")} placeholder="NEXHIRE2024"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1 shadow-md shadow-indigo-200">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Creating…" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
