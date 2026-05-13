import express from "express";
import jwt     from "jsonwebtoken";
import crypto  from "crypto";
import User    from "../models/User.js";
import { protect }      from "../middleware/auth.js";
import { uploadAvatar } from "../middleware/upload.js";

const router   = express.Router();
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

/* POST /api/auth/register */
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, company, inviteCode } = req.body;

    if (!["seeker","recruiter"].includes(role))
      return res.status(400).json({ error: "Invalid role." });

    if (await User.findOne({ email }))
      return res.status(409).json({ error: "Email already registered." });

    if (role === "recruiter" && process.env.REQUIRE_INVITE_CODE === "true")
      if (!inviteCode || inviteCode !== process.env.RECRUITER_INVITE_CODE)
        return res.status(403).json({ error: "Valid invite code required." });

    const user  = await User.create({ name, email, password, role,
      company: role === "recruiter" ? company : undefined });
    const token = signToken(user._id);

    res.status(201).json({ message: "Registration successful.", token, user });
  } catch (e) { next(e); }
});

/* POST /api/auth/login */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: "Invalid credentials." });

    if (!user.isActive)
      return res.status(403).json({ error: "Account deactivated." });

    user.password = undefined;
    res.json({ token: signToken(user._id), user });
  } catch (e) { next(e); }
});

/* GET /api/auth/me */
router.get("/me", protect, (req, res) => res.json({ user: req.user }));

/* PATCH /api/auth/profile */
router.patch("/profile", protect, async (req, res, next) => {
  try {
    const allowed = ["name","headline","skills","location","company"];
    const updates = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const user = await User.findByIdAndUpdate(req.user._id, updates,
      { new: true, runValidators: true });
    res.json({ user });
  } catch (e) { next(e); }
});

/* PATCH /api/auth/avatar */
router.patch("/avatar", protect, (req, res, next) => {
  uploadAvatar(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const user = await User.findByIdAndUpdate(req.user._id,
      { avatar: req.file.path }, { new: true });
    res.json({ avatar: user.avatar, user });
  });
});

/* POST /api/auth/generate-invite */
router.post("/generate-invite", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "recruiter")
      return res.status(403).json({ error: "Recruiters only." });
    const code = crypto.randomBytes(6).toString("hex").toUpperCase();
    await User.findByIdAndUpdate(req.user._id, { inviteCode: code });
    res.json({ inviteCode: code });
  } catch (e) { next(e); }
});

export default router;
