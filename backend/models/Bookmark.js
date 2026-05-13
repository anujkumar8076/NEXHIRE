import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  job:  { type: mongoose.Schema.Types.ObjectId, ref: "Job",  required: true },
}, { timestamps: true });

bookmarkSchema.index({ user: 1, job: 1 }, { unique: true });

export default mongoose.model("Bookmark", bookmarkSchema);
