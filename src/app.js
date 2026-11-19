
const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// root -> route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Notes API is Running",
    health: "/api/health"
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "200",
    message: "Note-Taking Platform is Running"
  });
});

// Auth routes
app.use("/api/auth", require("./routes/authRoutes"));

// Admin routes
app.use("/api/admin", require("./routes/adminRoutes"));

// Note routes
app.use("/api/notes", require("./routes/noteRoutes"));

// Posts and aggregation routes
app.use("/api", require("./routes/postRoutes"));

module.exports = app;
