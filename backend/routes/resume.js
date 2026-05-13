import express from "express";
import Resume  from "../models/Resume.js";
import Job     from "../models/Job.js";
import { protect, seekerOnly }      from "../middleware/auth.js";
import { uploadResume, deleteFromCloudinary } from "../middleware/upload.js";
import {
  extractFromResumeData, buildJobKeywordVector, calculateMatchScore,
} from "../utils/resumeMatcher.js";

const router = express.Router();

/* GET /api/resume/me */
router.get("/me", protect, seekerOnly, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ user: req.user._id });
    res.json({ resume: resume || null });
  } catch (e) { next(e); }
});

/* PUT /api/resume  — save structured builder data */
router.put("/", protect, seekerOnly, async (req, res, next) => {
  try {
    const { personalInfo, education, experience, skills, projects } = req.body;

    // Normalise comma-string skills → arrays
    const normSkills = {};
    for (const key of ["technical","soft","languages","certifications"]) {
      const v = skills?.[key];
      normSkills[key] = typeof v === "string"
        ? v.split(",").map((s) => s.trim()).filter(Boolean)
        : v || [];
    }

    const resumeData   = { personalInfo, education, experience, skills: normSkills, projects };
    const keywordVector = extractFromResumeData(resumeData);

    const resume = await Resume.findOneAndUpdate(
      { user: req.user._id },
      { ...resumeData, keywordVector, lastParsedAt: new Date(), user: req.user._id },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ resume, keywordCount: keywordVector.length });
  } catch (e) { next(e); }
});

/* POST /api/resume/upload  — upload PDF to Cloudinary */
router.post("/upload", protect, seekerOnly, (req, res, next) => {
  uploadResume(req, res, async (err) => {
    if (err)       return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file received." });

    try {
      const existing = await Resume.findOne({ user: req.user._id });
      if (existing?.uploadedResume?.publicId)
        await deleteFromCloudinary(existing.uploadedResume.publicId, "raw");

      const resume = await Resume.findOneAndUpdate(
        { user: req.user._id },
        {
          "uploadedResume.url":          req.file.path,
          "uploadedResume.publicId":     req.file.filename,
          "uploadedResume.originalName": req.file.originalname,
          "uploadedResume.uploadedAt":   new Date(),
          user: req.user._id,
        },
        { upsert: true, new: true }
      );

      res.json({ message: "Resume uploaded successfully.", url: req.file.path, resume });
    } catch (e) { next(e); }
  });
});

/* POST /api/resume/match/:jobId  — AI match score */
router.post("/match/:jobId", protect, seekerOnly, async (req, res, next) => {
  try {
    const [resume, job] = await Promise.all([
      Resume.findOne({ user: req.user._id }),
      Job.findById(req.params.jobId).select("+keywordVector"),
    ]);

    if (!resume) return res.status(404).json({ error: "Build or upload your resume first." });
    if (!job)    return res.status(404).json({ error: "Job not found." });

    const jobKws = job.keywordVector?.length ? job.keywordVector : buildJobKeywordVector(job);
    const result = calculateMatchScore(resume.keywordVector, jobKws);

    res.json({ ...result, resumeKeywordCount: resume.keywordVector.length });
  } catch (e) { next(e); }
});

/* GET /api/resume/suggested-jobs  — AI job recommendations */
router.get("/suggested-jobs", protect, seekerOnly, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ user: req.user._id });
    if (!resume?.keywordVector?.length)
      return res.json({ jobs: [], message: "Build your resume to get AI suggestions." });

    const jobs = await Job.find({
      status: "active",
      skills: { $in: resume.keywordVector.slice(0, 20) },
    })
      .populate("postedBy","name company companyLogo")
      .limit(10).lean();

    const scored = jobs
      .map((j) => {
        const { score } = calculateMatchScore(resume.keywordVector, buildJobKeywordVector(j));
        return { ...j, matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({ jobs: scored });
  } catch (e) { next(e); }
});

export default router;
