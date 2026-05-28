import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes         from "./routes/auth.js";
import jobRoutes          from "./routes/jobs.js";
import applicationRoutes  from "./routes/applications.js";
import resumeRoutes       from "./routes/resume.js";
import bookmarkRoutes     from "./routes/bookmarks.js";
import notificationRoutes from "./routes/notifications.js";
import { initSocketHandler } from "./utils/socketHandler.js";

dotenv.config();

const app        = express();
const httpServer = http.createServer(app);

/* ── DEFINED FIRST ───────────────────────────────────────────────────── */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://nexhire-sand.vercel.app",
];

/* ── Socket.io ──────────────────────────────────────────────────────── */
export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins, // ✅ Now it knows what allowedOrigins is!
    methods: ["GET", "POST"],
    credentials: true,
  },
});
initSocketHandler(io);

/* ── Core middleware ─────────────────────────────────────────────────── */
app.use(helmet());

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps/postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300,
  message: { error: "Too many requests — slow down!" } }));

/* ── Routes ──────────────────────────────────────────────────────────── */
app.use("/api/auth",          authRoutes);
app.use("/api/jobs",          jobRoutes);
app.use("/api/applications",  applicationRoutes);
app.use("/api/resume",        resumeRoutes);
app.use("/api/bookmarks",     bookmarkRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", app: "NexHire", ts: new Date().toISOString() })
);

/* ── Global error handler ────────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* ── Start ───────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 8000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
    httpServer.listen(PORT, () =>
      console.log(`🚀  NexHire API → http://localhost:${PORT}`)
    );
  })
  .catch((e) => { console.error("❌  DB error:", e.message); process.exit(1); });