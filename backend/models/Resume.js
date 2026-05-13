import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

  personalInfo: {
    phone: String, location: String, linkedIn: String,
    portfolio: String, github: String, summary: String,
  },

  education: [{
    institution: String, degree: String, field: String,
    startYear: Number, endYear: Number, grade: String,
  }],

  experience: [{
    company: String, role: String, location: String,
    startDate: String, endDate: String,
    isCurrent: { type: Boolean, default: false },
    description: String, achievements: [String],
  }],

  skills: {
    technical: [String], soft: [String],
    languages: [String], certifications: [String],
  },

  projects: [{
    name: String, description: String, techStack: [String],
    liveUrl: String, repoUrl: String,
  }],

  uploadedResume: {
    url:          { type: String, default: "" },
    publicId:     { type: String, default: "" },
    originalName: { type: String, default: "" },
    uploadedAt:   { type: Date,   default: null },
  },

  generatedPdf: {
    url:         { type: String, default: "" },
    publicId:    { type: String, default: "" },
    generatedAt: { type: Date,   default: null },
  },

  keywordVector: { type: [String], default: [] },
  parsedText:    { type: String,   default: "", select: false },
  lastParsedAt:  { type: Date,     default: null },
}, { timestamps: true });

export default mongoose.model("Resume", resumeSchema);
