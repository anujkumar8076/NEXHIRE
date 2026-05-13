import jwt  from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided." });

    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive)
      return res.status(401).json({ error: "Invalid or expired token." });

    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Token expired. Please log in again."
      : "Invalid token.";
    res.status(401).json({ error: msg });
  }
};

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: `Requires role: ${roles.join(" | ")}` });
  next();
};

export const recruiterOnly = authorizeRoles("recruiter");
export const seekerOnly    = authorizeRoles("seeker");
