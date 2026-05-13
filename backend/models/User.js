import mongoose from "mongoose";
import bcrypt    from "bcryptjs";

const notifSchema = new mongoose.Schema({
  message: String,
  type:    { type: String, enum: ["status_update","application","info"], default: "info" },
  isRead:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  meta:    mongoose.Schema.Types.Mixed,
});

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true,
              match: [/^\S+@\S+\.\S+$/, "Invalid email"] },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ["seeker","recruiter"], required: true },

  avatar:      { type: String, default: "" },
  headline:    { type: String, default: "" },
  skills:      [String],
  location:    { type: String, default: "" },

  // Recruiter-only
  company:     { type: String, default: "" },
  companyLogo: { type: String, default: "" },

  notifications: { type: [notifSchema], default: [] },
  inviteCode:    { type: String, default: null, select: false },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.password;
  delete o.inviteCode;
  return o;
};

export default mongoose.model("User", userSchema);
