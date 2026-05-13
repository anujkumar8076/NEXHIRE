import express     from "express";
import Job         from "../models/Job.js";
import Application from "../models/Application.js";
import { protect, recruiterOnly } from "../middleware/auth.js";
import { buildJobKeywordVector }  from "../utils/resumeMatcher.js";

const router = express.Router();

/* GET /api/jobs  — paginated public listing */
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10, search, location, jobType,
      locationType, experienceLevel, salaryMin, salaryMax,
      skills, sortBy = "createdAt",
    } = req.query;

    const q = { status: "active" };
    if (search)          q.$text          = { $search: search };
    if (location)        q.location       = { $regex: location, $options: "i" };
    if (jobType)         q.jobType        = jobType;
    if (locationType)    q.locationType   = locationType;
    if (experienceLevel) q.experienceLevel = experienceLevel;
    if (skills)          q.skills         = { $in: skills.split(",").map((s) => s.trim()) };
    if (salaryMin || salaryMax) {
      q["salary.min"] = {};
      if (salaryMin) q["salary.min"].$gte = Number(salaryMin);
      if (salaryMax) q["salary.max"]      = { $lte: Number(salaryMax) };
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const skip     = (pageNum - 1) * limitNum;
    const sort     = ({ createdAt: { createdAt: -1 }, salary: { "salary.max": -1 },
      applicants: { applicantCount: -1 } })[sortBy] || { createdAt: -1 };

    const [jobs, total] = await Promise.all([
      Job.find(q).populate("postedBy","name company companyLogo avatar")
        .sort(sort).skip(skip).limit(limitNum).lean(),
      Job.countDocuments(q),
    ]);

    res.json({
      jobs,
      pagination: {
        total, page: pageNum, limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
      },
    });
  } catch (e) { next(e); }
});

/* GET /api/jobs/recruiter/dashboard */
router.get("/recruiter/dashboard", protect, recruiterOnly, async (req, res, next) => {
  try {
    const rid = req.user._id;
    const [totalJobs, activeJobs, appStats, recentApps, recentJobs] = await Promise.all([
      Job.countDocuments({ postedBy: rid }),
      Job.countDocuments({ postedBy: rid, status: "active" }),
      Application.aggregate([{ $match: { recruiter: rid } },
        { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.find({ recruiter: rid }).sort({ createdAt: -1 }).limit(5)
        .populate("applicant","name email avatar headline")
        .populate("job","title company"),
      Job.find({ postedBy: rid }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const statusCounts = { applied:0, reviewing:0, interviewing:0, hired:0, rejected:0 };
    for (const { _id, count } of appStats)
      if (_id in statusCounts) statusCounts[_id] = count;

    res.json({
      stats: {
        totalJobs, activeJobs,
        totalApplications: Object.values(statusCounts).reduce((a,b)=>a+b,0),
        ...statusCounts,
      },
      recentApplications: recentApps,
      recentJobs,
    });
  } catch (e) { next(e); }
});

/* GET /api/jobs/recruiter/my-jobs */
router.get("/recruiter/my-jobs", protect, recruiterOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const q    = { postedBy: req.user._id };
    if (status) q.status = status;
    const skip = (parseInt(page)-1)*parseInt(limit);

    const [jobs, total] = await Promise.all([
      Job.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Job.countDocuments(q),
    ]);

    const counts = await Application.aggregate([
      { $match: { job: { $in: jobs.map(j=>j._id) } } },
      { $group: { _id: "$job", count: { $sum:1 } } },
    ]);
    const cm = Object.fromEntries(counts.map(c=>[c._id.toString(), c.count]));
    res.json({ jobs: jobs.map(j=>({ ...j, applicantCount: cm[j._id.toString()]||0 })), total });
  } catch (e) { next(e); }
});

/* GET /api/jobs/:id */
router.get("/:id", async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("postedBy","name company companyLogo avatar location");
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json({ job });
  } catch (e) { next(e); }
});

/* POST /api/jobs */
router.post("/", protect, recruiterOnly, async (req, res, next) => {
  try {
    const { title,company,companyLogo,description,requirements,skills,
      location,locationType,jobType,experienceLevel,salary,applicationDeadline,tags } = req.body;

    const data = {
      title, description, requirements, skills, location, locationType,
      jobType, experienceLevel, salary, tags,
      company:     company     || req.user.company,
      companyLogo: companyLogo || req.user.companyLogo,
      postedBy:    req.user._id,
      applicationDeadline: applicationDeadline || null,
    };
    data.keywordVector = buildJobKeywordVector(data);

    const job = await Job.create(data);
    await job.populate("postedBy","name company companyLogo");
    res.status(201).json({ job });
  } catch (e) { next(e); }
});

/* PATCH /api/jobs/:id */
router.patch("/:id", protect, recruiterOnly, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized." });

    const fields = ["title","description","requirements","skills","location",
      "locationType","jobType","experienceLevel","salary","status","applicationDeadline","tags"];
    for (const f of fields) if (req.body[f] !== undefined) job[f] = req.body[f];
    job.keywordVector = buildJobKeywordVector(job);
    await job.save();
    res.json({ job });
  } catch (e) { next(e); }
});

/* DELETE /api/jobs/:id  (soft-close) */
router.delete("/:id", protect, recruiterOnly, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized." });
    job.status = "closed";
    await job.save();
    res.json({ message: "Job closed." });
  } catch (e) { next(e); }
});

export default router;
