import express from "express";
import User    from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/* GET /api/notifications */
router.get("/", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("notifications");
    res.json({ notifications: user.notifications || [] });
  } catch (e) { next(e); }
});

/* PATCH /api/notifications/read-all */
router.patch("/read-all", protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id,
      { $set: { "notifications.$[].isRead": true } });
    res.json({ message: "All notifications read." });
  } catch (e) { next(e); }
});

/* DELETE /api/notifications */
router.delete("/", protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { notifications: [] } });
    res.json({ message: "Notifications cleared." });
  } catch (e) { next(e); }
});

export default router;
