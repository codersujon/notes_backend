const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// user -> self notes list (owner filter + newest first)
noteSchema.index({ owner: 1, createdAt: -1 });

// admin -> all notes list (newest first)
noteSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Note", noteSchema);