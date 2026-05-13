import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 150 },
  company:     { type: String, required: true, trim: true },
  companyLogo: { type: String, default: "" },
  description: { type: String, required: true, maxlength: 5000 },
  requirements:{ type: [String], default: [] },
  skills:      { type: [String], default: [], index: true },
  location:    { type: String, required: true },
  locationType:{ type: String, enum: ["remote","onsite","hybrid"], default: "onsite" },
  jobType:     { type: String, enum: ["full-time","part-time","contract","internship","freelance"], required: true },
  experienceLevel: { type: String, enum: ["entry","mid","senior","lead","executive"], required: true },
  salary: {
    min:       { type: Number, default: 0 },
    max:       { type: Number, default: 0 },
    currency:  { type: String, default: "USD" },
    period:    { type: String, enum: ["hourly","monthly","yearly"], default: "yearly" },
    isVisible: { type: Boolean, default: true },
  },
  postedBy:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status:             { type: String, enum: ["active","closed","draft"], default: "active", index: true },
  applicationDeadline:{ type: Date, default: null },
  applicantCount:     { type: Number, default: 0 },
  keywordVector:      { type: [String], default: [], select: false },
  tags:               { type: [String], default: [] },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

jobSchema.index({ title: "text", description: "text", skills: "text", tags: "text", company: "text" });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ postedBy: 1, status: 1 });

export default mongoose.model("Job", jobSchema);
