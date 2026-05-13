import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  status:    { type: String, enum: ["applied","reviewing","interviewing","hired","rejected"], required: true },
  changedAt: { type: Date, default: Date.now },
  note:      { type: String, default: "" },
});

const applicationSchema = new mongoose.Schema({
  job:       { type: mongoose.Schema.Types.ObjectId, ref: "Job",  required: true, index: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  status: {
    type: String,
    enum: ["applied","reviewing","interviewing","hired","rejected"],
    default: "applied",
    index: true,
  },
  statusHistory: [historySchema],

  resumeSnapshot: {
    url:      { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  coverLetter:    { type: String, maxlength: 2000, default: "" },

  matchScore:  { type: Number, default: 0, min: 0, max: 100 },
  matchDetails:{
    matchedKeywords: [String],
    totalJobKeywords: { type: Number, default: 0 },
  },

  recruiterNotes: { type: String, default: "", select: false },
  isWithdrawn:    { type: Boolean, default: false },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ recruiter: 1, status: 1, createdAt: -1 });

applicationSchema.pre("save", function (next) {
  if (this.isModified("status")) this.statusHistory.push({ status: this.status });
  next();
});

export default mongoose.model("Application", applicationSchema);
