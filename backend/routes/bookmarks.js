import express  from "express";
import Bookmark  from "../models/Bookmark.js";
import { protect, seekerOnly } from "../middleware/auth.js";

const router = express.Router();

/* GET /api/bookmarks */
router.get("/", protect, seekerOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookmarks, total] = await Promise.all([
      Bookmark.find({ user: req.user._id })
        .populate({ path: "job",
          populate: { path: "postedBy", select: "name company companyLogo" } })
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Bookmark.countDocuments({ user: req.user._id }),
    ]);
    res.json({ bookmarks,
      pagination: { total, page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (e) { next(e); }
});

/* POST /api/bookmarks/:jobId */
router.post("/:jobId", protect, seekerOnly, async (req, res, next) => {
  try {
    const bm = await Bookmark.create({ user: req.user._id, job: req.params.jobId });
    res.status(201).json({ bookmark: bm, bookmarked: true });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Already bookmarked." });
    next(e);
  }
});

/* DELETE /api/bookmarks/:jobId */
router.delete("/:jobId", protect, seekerOnly, async (req, res, next) => {
  try {
    await Bookmark.findOneAndDelete({ user: req.user._id, job: req.params.jobId });
    res.json({ bookmarked: false });
  } catch (e) { next(e); }
});

/* GET /api/bookmarks/check/:jobId */
router.get("/check/:jobId", protect, seekerOnly, async (req, res, next) => {
  try {
    const exists = await Bookmark.exists({ user: req.user._id, job: req.params.jobId });
    res.json({ bookmarked: !!exists });
  } catch (e) { next(e); }
});

export default router;
