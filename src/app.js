const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// health test
app.get("/api/health", (req, res) => res.json({ ok: true }));

// auth routes
app.use("/api/auth", require("./routes/authRoutes"));

module.exports = app;