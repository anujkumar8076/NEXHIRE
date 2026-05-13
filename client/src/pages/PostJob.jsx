import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { forwardRef } from "react";

import {
  Briefcase, MapPin, DollarSign, Plus, Trash2,
  Loader2, CheckCircle2, AlertCircle, ChevronLeft, Zap,
} from "lucide-react";
import api  from "../utils/api";
import clsx from "clsx";

const TYPES  = ["full-time","part-time","contract","internship","freelance"];
const LOCS   = ["onsite","remote","hybrid"];
const EXPS   = ["entry","mid","senior","lead","executive"];
const STEPS  = ["Job Details","Requirements","Compensation"];

const Field = ({ label, error, children, hint }) => (
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
      {label}{hint && <span className="text-gray-400 font-normal text-xs ml-1">{hint}</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// const Input = ({ className, ...props }) => (
//   <input {...props}
//     className={clsx("w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm",
//       "focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all",
//       props['aria-invalid'] && "border-red-300", className)} />
// );
const Input = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={clsx(
      "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm",
      "focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all",
      props["aria-invalid"] && "border-red-300",
      className
    )}
  />
));

Input.displayName = "Input";

export default function PostJob() {
  const navigate = useNavigate();
  const [step,       setStep]       = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState("");

  const { register, control, handleSubmit, watch, trigger, formState:{ errors } } = useForm({
    defaultValues: {
      title:"", company:"", description:"", location:"",
      locationType:"onsite", jobType:"full-time", experienceLevel:"mid",
      skills:"", tags:"",
      requirements:[{ value:"" }],
      salary:{ min:"", max:"", currency:"USD", period:"yearly", isVisible:true },
      applicationDeadline:"",
    },
  });

  const { fields:reqF, append:addReq, remove:delReq } = useFieldArray({ control, name:"requirements" });

  const STEP_FIELDS = [
    ["title","company","description","location","locationType","jobType","experienceLevel"],
    ["requirements"],
    [],
  ];

  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => s + 1);
  };

  const onSubmit = async (data) => {
    setSubmitting(true); setError("");
    try {
      const payload = {
        ...data,
        skills:       data.skills.split(",").map((s) => s.trim()).filter(Boolean),
        tags:         data.tags.split(",").map((t) => t.trim()).filter(Boolean),
        requirements: data.requirements.map((r) => r.value).filter(Boolean),
        salary: {
          ...data.salary,
          min: Number(data.salary.min) || 0,
          max: Number(data.salary.max) || 0,
        },
        applicationDeadline: data.applicationDeadline || null,
      };
      await api.post("/jobs", payload);
      setSuccess(true);
      setTimeout(() => navigate("/recruiter/dashboard"), 1800);
    } catch (e) {
      setError(e?.error || "Failed to post job.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return (
    <div className="min-h-[65vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Job Posted!</h2>
        <p className="text-gray-500 text-sm">Redirecting to your dashboard…</p>
      </div>
    </div>
  );

  const RadioGroup = ({ name, options }) => {
    const val = watch(name);
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className={clsx(
            "px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer capitalize transition-all select-none",
            val===o ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300")}>
            <input type="radio" {...register(name)} value={o} className="sr-only" />
            {o.replace("-"," ")}
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => step > 0 ? setStep((s) => s-1) : navigate(-1)}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-500" />Post a Job
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Step {step+1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className={clsx("flex items-center", i < STEPS.length-1 && "flex-1")}>
            <div className="flex items-center gap-2">
              <div className={clsx(
                "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all",
                i < step  ? "bg-indigo-600 border-indigo-600 text-white"
                : i===step ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                           : "border-gray-200 text-gray-400 bg-white")}>
                {i < step ? <CheckCircle2 className="w-5 h-5" /> : i+1}
              </div>
              <span className={clsx("text-xs font-semibold hidden sm:block",
                i===step ? "text-indigo-600" : i<step ? "text-gray-700" : "text-gray-400")}>{s}</span>
            </div>
            {i < STEPS.length-1 && (
              <div className={clsx("flex-1 h-0.5 mx-3 rounded-full", i < step ? "bg-indigo-500" : "bg-gray-200")} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Step 0: Job Details ─────────────────────────────── */}
        {step===0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-500" />Job Details
            </h2>

            <Field label="Job Title *" error={errors.title?.message}>
              <Input {...register("title",{ required:"Title is required" })}
                placeholder="e.g. Senior React Developer"
                aria-invalid={!!errors.title} />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Company *" error={errors.company?.message}>
                <Input {...register("company",{ required:"Company is required" })}
                  placeholder="Acme Corp" aria-invalid={!!errors.company} />
              </Field>
              <Field label="Location *" error={errors.location?.message}>
                <Input {...register("location",{ required:"Location is required" })}
                  placeholder="New York, NY" aria-invalid={!!errors.location} />
              </Field>
            </div>

            <Field label="Job Type *">
              <RadioGroup name="jobType" options={TYPES} />
            </Field>

            <Field label="Work Mode *">
              <RadioGroup name="locationType" options={LOCS} />
            </Field>

            <Field label="Experience Level *">
              <RadioGroup name="experienceLevel" options={EXPS} />
            </Field>

            <Field label="Job Description *" error={errors.description?.message}>
              <textarea {...register("description",{
                required:"Description is required",
                minLength:{ value:50, message:"At least 50 characters" }
              })} rows={6} placeholder="Describe the role, responsibilities, and why it's exciting…"
                className={clsx("w-full border rounded-xl px-4 py-2.5 text-sm resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-400",
                  errors.description && "border-red-300")} />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </Field>

            <Field label="Required Skills" hint="(comma-separated)">
              <Input {...register("skills")} placeholder="React, TypeScript, Node.js, MongoDB…" />
            </Field>

            <Field label="Tags" hint="(comma-separated)">
              <Input {...register("tags")} placeholder="startup, fintech, equity, visa-sponsor…" />
            </Field>
          </div>
        )}

        {/* ── Step 1: Requirements ────────────────────────────── */}
        {step===1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Requirements & Qualifications</h2>
              <p className="text-sm text-gray-400 mt-0.5">Add each requirement as a bullet point.</p>
            </div>

            <div className="space-y-2.5">
              {reqF.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-2.5">
                    <span className="text-xs font-bold text-indigo-600">{i+1}</span>
                  </div>
                  <input {...register(`requirements.${i}.value`)}
                    placeholder={`Requirement ${i+1}…`}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  {reqF.length > 1 && (
                    <button type="button" onClick={() => delReq(i)}
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={() => addReq({ value:"" })}
              className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl text-sm font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add Requirement
            </button>
          </div>
        )}

        {/* ── Step 2: Compensation ────────────────────────────── */}
        {step===2 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-500" />Compensation
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Min Salary">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input {...register("salary.min")} type="number" placeholder="60000" className="pl-8" />
                </div>
              </Field>
              <Field label="Max Salary">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input {...register("salary.max")} type="number" placeholder="120000" className="pl-8" />
                </div>
              </Field>
              <Field label="Currency">
                <select {...register("salary.currency")}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {["USD","EUR","GBP","INR","CAD","AUD","SGD"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Period">
                <select {...register("salary.period")}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="yearly">Per Year</option>
                  <option value="monthly">Per Month</option>
                  <option value="hourly">Per Hour</option>
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" {...register("salary.isVisible")} defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-gray-700">Show salary to applicants</span>
            </label>

            <Field label="Application Deadline" hint="(optional)">
              <Input type="date" {...register("applicationDeadline")}
                min={new Date().toISOString().split("T")[0]} />
            </Field>

            {/* Preview card */}
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">Preview</p>
              <div className="text-sm text-indigo-900 space-y-1">
                <p><span className="font-semibold">Role:</span> {watch("title") || "—"}</p>
                <p><span className="font-semibold">Type:</span> {watch("jobType")} · {watch("locationType")} · {watch("experienceLevel")}</p>
                <p><span className="font-semibold">Location:</span> {watch("location") || "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s-1)}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          {step < STEPS.length-1 ? (
            <button type="button" onClick={next}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-indigo-200">
              Continue →
            </button>
          ) : (
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing…</>
                : <><Zap className="w-4 h-4 fill-white" />Publish Job</>}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
