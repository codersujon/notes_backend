const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// $lookup foreignField + a user's posts newest first
postSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);