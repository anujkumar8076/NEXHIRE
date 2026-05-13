import multer               from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ── Storage engines ─────────────────────────────────────────────────── */
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder:        `nexhire/resumes/${req.user._id}`,
    resource_type: "raw",
    allowed_formats: ["pdf","doc","docx"],
    public_id:     `resume_${req.user._id}_${Date.now()}`,
  }),
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder:        "nexhire/avatars",
    resource_type: "image",
    allowed_formats: ["jpg","jpeg","png","webp"],
    public_id:     `avatar_${req.user._id}_${Date.now()}`,
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  }),
});

const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:        "nexhire/logos",
    resource_type: "image",
    allowed_formats: ["jpg","jpeg","png","webp","svg"],
    transformation: [{ width: 200, height: 200, crop: "pad" }],
  },
});

/* ── File filters ────────────────────────────────────────────────────── */
const pdfFilter = (req, file, cb) => {
  const ok = ["application/pdf","application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  ok.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only PDF/Word files allowed."), false);
};

const imgFilter = (req, file, cb) =>
  file.mimetype.startsWith("image/")
    ? cb(null, true)
    : cb(new Error("Only image files allowed."), false);

/* ── Multer instances ────────────────────────────────────────────────── */
export const uploadResume = multer({ storage: resumeStorage, fileFilter: pdfFilter,
  limits: { fileSize: 5 * 1024 * 1024 } }).single("resume");

export const uploadAvatar = multer({ storage: avatarStorage, fileFilter: imgFilter,
  limits: { fileSize: 2 * 1024 * 1024 } }).single("avatar");

export const uploadLogo   = multer({ storage: logoStorage, fileFilter: imgFilter,
  limits: { fileSize: 2 * 1024 * 1024 } }).single("logo");

/* ── Helper ──────────────────────────────────────────────────────────── */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try { await cloudinary.uploader.destroy(publicId, { resource_type: resourceType }); }
  catch (e) { console.error("Cloudinary delete error:", e.message); }
};

export { cloudinary };
