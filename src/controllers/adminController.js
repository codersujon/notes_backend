const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");
const Note = require("../models/Note");
const paginate = require("../utils/paginate");

const safe = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  interests: u.interests,
  createdAt: u.createdAt,
});

const badId = (id) => !mongoose.isValidObjectId(id);

// List all users (paginated)
exports.listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(),
    ]);
    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: users.map(safe),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a user (admin can set role)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, interests } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password required" });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, interests });
    res.status(201).json(safe(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Update a user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (badId(id)) return res.status(400).json({ message: "Invalid id" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, password, role, interests } = req.body;

    // Admin must not demote themselves
    if (id === req.user.id && role && role !== "admin") {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (interests !== undefined) user.interests = interests;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    res.json(safe(user));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already used" });
    }
    res.status(500).json({ message: err.message });
  }
};

// Remove a user (and their notes)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (badId(id)) return res.status(400).json({ message: "Invalid id" });

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Cascade: owner_1_createdAt_-1 index serves this filter (prefix)
    await Note.deleteMany({ owner: id });
    // TODO: delete this user's posts after the Post model is added
    await user.deleteOne();

    res.json({ message: "User and their notes deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};