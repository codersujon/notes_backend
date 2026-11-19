const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6, select: false },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        interests: { type: [String], default: [] },
    },
    { timestamps: true }
);

// login lookup + email uniqueness
userSchema.index({ email: 1 }, { unique: true });

// admin users list (newest first)
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);