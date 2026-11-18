const Note = require("../models/Note");
const paginate = require("../utils/paginate");

//** user notes list */
exports.listMine = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = { owner: req.user.id };

    const [notes, total] = await Promise.all([
      Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Note.countDocuments(filter),
    ]);

    res.json({ page, limit, total, totalPages: Math.ceil(total / limit), data: notes });

  } catch (err) {
    res.status(500).json({ 
        message: err.message 
    });
  }
};

//** create */
exports.create = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ 
        message: "title required" 
    });

    const note = await Note.create({ 
        title, content, owner: req.user.id 
    });
    res.status(201).json(note);

  } catch (err) {
    res.status(500).json({ 
        message: err.message 
    });
  }
};

//** owner or admin -> note given, otherwise null */
const findAllowed = async (req) => {
  const note = await Note.findById(req.params.id);
  if (!note) return null;

  const isOwner = note.owner.toString() === req.user.id;
  if (!isOwner && req.user.role !== "admin") return null;
  return note;

};

//** single one */
exports.getOne = async (req, res) => {
  try {
    const note = await findAllowed(req);
    if (!note) return res.status(404).json({ 
        message: "Note not found" 
    });
    res.json(note);

  } catch (err) {
    res.status(500).json({ 
        message: err.message 
    });
  }
};

//** update */
exports.update = async (req, res) => {
  try {
    const note = await findAllowed(req);
    if (!note) return res.status(404).json({ message: "Note not found" });

    const { title, content } = req.body;
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//** remove */
exports.remove = async (req, res) => {
  try {
    const note = await findAllowed(req);
    if (!note) return res.status(404).json({ 
        message: "Note not found" 
    });

    await note.deleteOne();
    res.json({ message: "Note deleted" });

  } catch (err) {
    res.status(500).json({ 
        message: err.message 
    });
  }
};


//** admin: all notes */
exports.listAll = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);

    const [notes, total] = await Promise.all([
      Note.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("owner", "name email").lean(),
      Note.countDocuments(),
    ]);

    res.json({ page, limit, total, totalPages: Math.ceil(total / limit), data: notes });

  } catch (err) {
    res.status(500).json({ 
        message: err.message 
    });
  }
};