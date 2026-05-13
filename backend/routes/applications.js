import express     from "express";
import Application from "../models/Application.js";
import Job         from "../models/Job.js";
import Resume      from "../models/Resume.js";
import User        from "../models/User.js";
import { protect, recruiterOnly, seekerOnly } from "../middleware/auth.js";
import { calculateMatchScore, buildJobKeywordVector } from "../utils/resumeMatcher.js";
import { io }                   from "../server.js";
import { notifyUser, broadcastToJobRoom } from "../utils/socketHandler.js";

const router = express.Router();

const STATUS_MSGS = {
  reviewing:    "is now being reviewed",
  interviewing: "has moved to interview stage 🎤",
  hired:        "— Congratulations, you've been hired! 🎉",
  rejected:     "was not selected at this time.",
};

/* POST /api/applications  — apply */
router.post("/", protect, seekerOnly, async (req, res, next) => {
  try {
    const { jobId, coverLetter } = req.body;

    const job = await Job.findById(jobId).select("+keywordVector");
    if (!job || job.status !== "active")
      return res.status(404).json({ error: "Job not found or closed." });

    if (job.applicationDeadline && new Date() > job.applicationDeadline)
      return res.status(400).json({ error: "Application deadline passed." });

    if (await Application.findOne({ job: jobId, applicant: req.user._id }))
      return res.status(409).json({ error: "Already applied." });

    const resume = await Resume.findOne({ user: req.user._id });

    let matchScore = 0, matchDetails = { matchedKeywords:[], totalJobKeywords:0 };
    let resumeSnapshot = {};

    if (resume) {
      const jKws = job.keywordVector?.length ? job.keywordVector : buildJobKeywordVector(job);
      const r    = calculateMatchScore(resume.keywordVector, jKws);
      matchScore   = r.score;
      matchDetails = { matchedKeywords: r.matchedKeywords, totalJobKeywords: r.totalJobKeywords };
      if (resume.uploadedResume?.url)
        resumeSnapshot = { url: resume.uploadedResume.url, publicId: resume.uploadedResume.publicId };
    }

    const application = await Application.create({
      job: jobId, applicant: req.user._id, recruiter: job.postedBy,
      coverLetter, matchScore, matchDetails, resumeSnapshot,
      statusHistory: [{ status: "applied" }],
    });

    await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

    notifyUser(io, job.postedBy.toString(), {
      type: "new_application",
      message: `${req.user.name} applied to ${job.title}`,
      applicationId: application._id, jobId,
    });

    await application.populate([
      { path: "job",       select: "title company" },
      { path: "applicant", select: "name email avatar" },
    ]);

    res.status(201).json({ application, matchScore, matchDetails });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Already applied." });
    next(e);
  }
});

/* GET /api/applications/my */
router.get("/my", protect, seekerOnly, async (req, res, next) => {
  try {
    const { page=1, limit=10, status } = req.query;
    const q    = { applicant: req.user._id, isWithdrawn: false };
    if (status) q.status = status;
    const skip = (parseInt(page)-1)*parseInt(limit);

    const [applications, total] = await Promise.all([
      Application.find(q)
        .populate("job","title company companyLogo location jobType salary status")
        .sort({ createdAt:-1 }).skip(skip).limit(parseInt(limit)),
      Application.countDocuments(q),
    ]);

    res.json({ applications, pagination: { total, page:parseInt(page),
      totalPages: Math.ceil(total/parseInt(limit)),
      hasNextPage: parseInt(page) < Math.ceil(total/parseInt(limit)) } });
  } catch (e) { next(e); }
});

/* GET /api/applications/job/:jobId */
router.get("/job/:jobId", protect, recruiterOnly, async (req, res, next) => {
  try {
    const { page=1, limit=10, status, sortBy="matchScore" } = req.query;
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized." });

    const q    = { job: req.params.jobId };
    if (status) q.status = status;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const sort = sortBy === "matchScore" ? { matchScore:-1 } : { createdAt:-1 };

    const [applications, total] = await Promise.all([
      Application.find(q)
        .populate("applicant","name email avatar headline skills location")
        .sort(sort).skip(skip).limit(parseInt(limit)),
      Application.countDocuments(q),
    ]);

    res.json({ applications, total, job: { title: job.title, company: job.company } });
  } catch (e) { next(e); }
});

/* PATCH /api/applications/:id/status */
router.patch("/:id/status", protect, recruiterOnly, async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const valid = ["applied","reviewing","interviewing","hired","rejected"];
    if (!valid.includes(status))
      return res.status(400).json({ error: "Invalid status." });

    const application = await Application.findById(req.params.id)
      .populate("job","title company")
      .populate("applicant","name email _id");
    if (!application) return res.status(404).json({ error: "Not found." });
    if (application.recruiter.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized." });

    const previousStatus = application.status;
    application.status   = status;
    if (note) application.statusHistory.at(-1).note = note;
    await application.save();

    const msg = `Your application for ${application.job.title} at ${application.job.company} ${STATUS_MSGS[status] || `is now: ${status}`}`;

    await User.findByIdAndUpdate(application.applicant._id, {
      $push: {
        notifications: {
          $each: [{ message: msg, type: "status_update",
            meta: { applicationId: application._id, jobId: application.job._id,
              previousStatus, newStatus: status } }],
          $position: 0, $slice: 50,
        },
      },
    });

    notifyUser(io, application.applicant._id.toString(), {
      type: "status_update", message: msg,
      applicationId: application._id,
      jobId: application.job._id, status, previousStatus,
    });

    broadcastToJobRoom(io, application.job._id.toString(), "application:statusChanged", {
      applicationId: application._id, status, applicantId: application.applicant._id,
    });

    res.json({ application });
  } catch (e) { next(e); }
});

/* DELETE /api/applications/:id  — withdraw */
router.delete("/:id", protect, seekerOnly, async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Not found." });
    if (app.applicant.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized." });
    if (["hired","rejected"].includes(app.status))
      return res.status(400).json({ error: "Cannot withdraw a finalised application." });

    app.isWithdrawn = true;
    await app.save();
    await Job.findByIdAndUpdate(app.job, { $inc: { applicantCount: -1 } });
    res.json({ message: "Application withdrawn." });
  } catch (e) { next(e); }
});

export default router;
