const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const paginate = require("../utils/paginate");

// Create a post (logged-in user)
exports.create = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ message: "title required" });
    const post = await Post.create({ title, content, author: req.user.id });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Scenario 2: one user's posts, single aggregate with $lookup
exports.byUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const { page, limit, skip } = paginate(req.query);

    const result = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "posts",
          let: { uid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$author", "$$uid"] } } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          as: "posts",
        },
      },
      { $project: { name: 1, email: 1, posts: 1 } },
    ]);

    if (!result.length) return res.status(404).json({ message: "User not found" });
    res.json({ page, limit, ...result[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Scenario 1: users grouped by interest, exactly one aggregate call
exports.groupedByInterests = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);

    const result = await User.aggregate([
      { $unwind: "$interests" },
      {
        $group: {
          _id: "$interests",
          count: { $sum: 1 },
          users: { $push: { id: "$_id", name: "$name" } },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "n" }],
        },
      },
    ]);

    const total = result[0].total[0]?.n || 0;
    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: result[0].data,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};