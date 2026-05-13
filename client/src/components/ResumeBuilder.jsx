import { useState, useRef, useCallback } from "react";
import { useForm, useFieldArray }         from "react-hook-form";
import jsPDF from "jspdf";
import {
  Save, Download, Upload, Plus, Trash2, Loader2,
  User, Briefcase, GraduationCap, Code2, FolderGit2,
} from "lucide-react";
import api  from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import clsx  from "clsx";

const TABS = [
  { id:"personal",   label:"Personal",   icon:User },
  { id:"experience", label:"Experience", icon:Briefcase },
  { id:"education",  label:"Education",  icon:GraduationCap },
  { id:"skills",     label:"Skills",     icon:Code2 },
  { id:"projects",   label:"Projects",   icon:FolderGit2 },
];

const Field = ({ label, error, children }) => (
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Input = (props) => (
  <input {...props}
    className={clsx("w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm",
      "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent", props.className)} />
);

const Textarea = (props) => (
  <textarea {...props}
    className={clsx("w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none",
      "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent", props.className)} />
);

export default function ResumeBuilder({ initialData }) {
  const { user }  = useAuth();
  const fileRef   = useRef(null);
  const [tab,     setTab]     = useState("personal");
  const [saving,  setSaving]  = useState(false);
  const [uploading,setUploading] = useState(false);
  const [genPdf,  setGenPdf]  = useState(false);

  const { register, control, handleSubmit, getValues } = useForm({
    defaultValues: initialData || {
      personalInfo: { phone:"", location:"", linkedIn:"", portfolio:"", github:"", summary:"" },
      experience: [], education: [],
      skills: { technical:"", soft:"", languages:"", certifications:"" },
      projects: [],
    },
  });

  const { fields:expF, append:addExp, remove:delExp } = useFieldArray({ control, name:"experience" });
  const { fields:eduF, append:addEdu, remove:delEdu } = useFieldArray({ control, name:"education"  });
  const { fields:prjF, append:addPrj, remove:delPrj } = useFieldArray({ control, name:"projects"   });

  /* Save to DB */
  const onSave = async (data) => {
    setSaving(true);
    try {
      const skills = {};
      for (const k of ["technical","soft","languages","certifications"]) {
        const v = data.skills?.[k];
        skills[k] = typeof v === "string" ? v.split(",").map((s)=>s.trim()).filter(Boolean) : v||[];
      }
      await api.put("/resume", { ...data, skills });
      toast.success("Resume saved! Keywords updated ✓");
    } catch { toast.error("Save failed."); }
    finally { setSaving(false); }
  };

  /* Upload PDF */
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      await api.post("/resume/upload", fd, { headers:{ "Content-Type":"multipart/form-data" } });
      toast.success("Resume uploaded to cloud ☁️");
    } catch { toast.error("Upload failed. Max 5 MB PDF/DOC."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  /* Generate PDF */
  const generatePDF = useCallback(async () => {
    setGenPdf(true);
    try {
      const d   = getValues();
      const doc = new jsPDF({ unit:"pt", format:"a4" });
      const W   = doc.internal.pageSize.getWidth();
      const M   = 50;
      let y     = M;

      const checkPage = (need=60) => {
        if (y + need > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; }
      };

      const sectionTitle = (title) => {
        y += 10;
        doc.setFillColor(79,70,229);
        doc.rect(M, y - 10, W - M*2, 1.5, "F");
        y += 6;
        doc.setFontSize(9); doc.setFont("helvetica","bold");
        doc.setTextColor(79,70,229);
        doc.text(title.toUpperCase(), M, y);
        y += 14;
      };

      /* ── Header ── */
      doc.setFillColor(79,70,229);
      doc.rect(0,0,W,75,"F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold"); doc.setFontSize(22);
      doc.text(user?.name || "Your Name", M, 42);
      doc.setFont("helvetica","normal"); doc.setFontSize(11);
      doc.text(user?.headline || "", M, 62);
      y = 92;

      /* contact row */
      const contact = [d.personalInfo?.phone, d.personalInfo?.location,
        d.personalInfo?.linkedIn, d.personalInfo?.portfolio].filter(Boolean).join("  |  ");
      doc.setFontSize(8.5); doc.setTextColor(90,90,90);
      doc.text(contact, M, y); y += 18;

      /* ── Summary ── */
      if (d.personalInfo?.summary) {
        sectionTitle("Summary");
        doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(50,50,50);
        const lines = doc.splitTextToSize(d.personalInfo.summary, W - M*2);
        doc.text(lines, M, y); y += lines.length*13 + 6;
      }

      /* ── Experience ── */
      if (d.experience?.length) {
        sectionTitle("Experience");
        for (const e of d.experience) {
          checkPage();
          doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(30,30,30);
          doc.text(`${e.role} — ${e.company}`, M, y); y += 14;
          doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(120,120,120);
          doc.text(`${e.startDate} – ${e.isCurrent?"Present":e.endDate}  |  ${e.location||""}`, M, y); y += 13;
          if (e.description) {
            doc.setFontSize(10); doc.setTextColor(60,60,60);
            const lines = doc.splitTextToSize(e.description, W-M*2);
            doc.text(lines, M, y); y += lines.length*13;
          }
          y += 8;
        }
      }

      /* ── Education ── */
      if (d.education?.length) {
        sectionTitle("Education");
        for (const e of d.education) {
          checkPage();
          doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(30,30,30);
          doc.text(`${e.degree} in ${e.field}`, M, y); y += 14;
          doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(60,60,60);
          doc.text(`${e.institution}  |  ${e.startYear}–${e.endYear}`, M, y); y += 13;
          if (e.grade) { doc.setFontSize(9); doc.setTextColor(130,130,130); doc.text(`Grade: ${e.grade}`, M, y); y += 12; }
          y += 4;
        }
      }

      /* ── Skills ── */
      const sk = d.skills || {};
      const skLines = [
        sk.technical     && `Technical: ${Array.isArray(sk.technical)?sk.technical.join(", "):sk.technical}`,
        sk.soft          && `Soft Skills: ${Array.isArray(sk.soft)?sk.soft.join(", "):sk.soft}`,
        sk.languages     && `Languages: ${Array.isArray(sk.languages)?sk.languages.join(", "):sk.languages}`,
        sk.certifications&& `Certifications: ${Array.isArray(sk.certifications)?sk.certifications.join(", "):sk.certifications}`,
      ].filter(Boolean);
      if (skLines.length) {
        sectionTitle("Skills");
        for (const line of skLines) {
          doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(50,50,50);
          const wrapped = doc.splitTextToSize(line, W-M*2);
          doc.text(wrapped, M, y); y += wrapped.length*13+4;
        }
      }

      /* ── Projects ── */
      if (d.projects?.length) {
        sectionTitle("Projects");
        for (const p of d.projects) {
          checkPage();
          doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(30,30,30);
          doc.text(p.name, M, y); y += 14;
          if (p.techStack) {
            doc.setFontSize(9); doc.setTextColor(79,70,229);
            doc.text(Array.isArray(p.techStack)?p.techStack.join(" · "):p.techStack, M, y); y += 13;
          }
          if (p.description) {
            doc.setFontSize(10); doc.setTextColor(60,60,60);
            const lines = doc.splitTextToSize(p.description, W-M*2);
            doc.text(lines, M, y); y += lines.length*13;
          }
          y += 8;
        }
      }

      /* Footer */
      const pages = doc.internal.getNumberOfPages();
      for (let i=1;i<=pages;i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(180,180,180);
        doc.text(`${user?.name} · Resume · Page ${i}/${pages}`, M,
          doc.internal.pageSize.getHeight()-18);
      }

      doc.save(`${(user?.name||"resume").replace(/\s+/g,"_")}_nexhire_resume.pdf`);
      toast.success("PDF downloaded! 🎉");
    } catch (e) { console.error(e); toast.error("PDF generation failed."); }
    finally { setGenPdf(false); }
  }, [getValues, user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Resume Builder</h1>
          <p className="text-sm text-gray-500">Your data fuels AI job matching.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload PDF
          </button>
          <button onClick={generatePDF} disabled={genPdf}
            className="flex items-center gap-1.5 px-4 py-2 border border-indigo-200 text-indigo-700 rounded-xl text-sm hover:bg-indigo-50 transition-colors disabled:opacity-60">
            {genPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
          <button onClick={handleSubmit(onSave)} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx("flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              tab===id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-4">

        {/* Personal */}
        {tab==="personal" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-base">Personal Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[["personalInfo.phone","Phone","+1 (555) 000-0000"],
                ["personalInfo.location","Location","San Francisco, CA"],
                ["personalInfo.linkedIn","LinkedIn","linkedin.com/in/yourname"],
                ["personalInfo.portfolio","Portfolio","yoursite.com"],
                ["personalInfo.github","GitHub","github.com/username"],
              ].map(([name,label,ph]) => (
                <Field key={name} label={label}>
                  <Input {...register(name)} placeholder={ph} />
                </Field>
              ))}
            </div>
            <Field label="Professional Summary">
              <Textarea {...register("personalInfo.summary")} rows={4}
                placeholder="A brief overview of your professional background…" />
            </Field>
          </div>
        )}

        {/* Experience */}
        {tab==="experience" && (
          <div className="space-y-4">
            {expF.map((f,i) => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Experience #{i+1}</h3>
                  <button type="button" onClick={() => delExp(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[["role","Role","Senior Engineer"],["company","Company","Acme Corp"],
                    ["startDate","Start Date","Jan 2022"],["endDate","End Date","Dec 2023"],
                    ["location","Location","Remote"]].map(([name,label,ph]) => (
                    <Field key={name} label={label}>
                      <Input {...register(`experience.${i}.${name}`)} placeholder={ph} />
                    </Field>
                  ))}
                </div>
                <Field label="Description">
                  <Textarea {...register(`experience.${i}.description`)} rows={3}
                    placeholder="Key responsibilities and achievements…" />
                </Field>
              </div>
            ))}
            <button type="button"
              onClick={() => addExp({ role:"",company:"",startDate:"",endDate:"",location:"",description:"" })}
              className="w-full py-3.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add Experience
            </button>
          </div>
        )}

        {/* Education */}
        {tab==="education" && (
          <div className="space-y-4">
            {eduF.map((f,i) => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Education #{i+1}</h3>
                  <button type="button" onClick={() => delEdu(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[["institution","Institution","MIT"],["degree","Degree","B.Sc."],
                    ["field","Field of Study","Computer Science"],["grade","Grade / GPA","3.9"],
                    ["startYear","Start Year","2018"],["endYear","End Year","2022"]].map(([name,label,ph]) => (
                    <Field key={name} label={label}>
                      <Input {...register(`education.${i}.${name}`)} placeholder={ph} />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
            <button type="button"
              onClick={() => addEdu({ institution:"",degree:"",field:"",grade:"",startYear:"",endYear:"" })}
              className="w-full py-3.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add Education
            </button>
          </div>
        )}

        {/* Skills */}
        {tab==="skills" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Skills <span className="font-normal text-sm text-gray-400">(comma-separated)</span></h2>
            {[["skills.technical","Technical Skills","React, Node.js, Python, MongoDB…"],
              ["skills.soft","Soft Skills","Leadership, Communication…"],
              ["skills.languages","Languages","English, Spanish…"],
              ["skills.certifications","Certifications","AWS, PMP, Google Cloud…"],
            ].map(([name,label,ph]) => (
              <Field key={name} label={label}>
                <Input {...register(name)} placeholder={ph} />
              </Field>
            ))}
          </div>
        )}

        {/* Projects */}
        {tab==="projects" && (
          <div className="space-y-4">
            {prjF.map((f,i) => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Project #{i+1}</h3>
                  <button type="button" onClick={() => delPrj(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Field label="Project Name"><Input {...register(`projects.${i}.name`)} placeholder="NexHire" /></Field>
                <Field label="Tech Stack (comma-separated)"><Input {...register(`projects.${i}.techStack`)} placeholder="React, Node.js, MongoDB" /></Field>
                <Field label="Description">
                  <Textarea {...register(`projects.${i}.description`)} rows={3} placeholder="What it does and what you built…" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Live URL"><Input {...register(`projects.${i}.liveUrl`)} placeholder="https://…" /></Field>
                  <Field label="GitHub URL"><Input {...register(`projects.${i}.repoUrl`)} placeholder="github.com/…" /></Field>
                </div>
              </div>
            ))}
            <button type="button"
              onClick={() => addPrj({ name:"",techStack:"",description:"",liveUrl:"",repoUrl:"" })}
              className="w-full py-3.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add Project
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
