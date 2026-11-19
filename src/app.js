const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

//** auth routes */
app.use("/api/auth", require("./routes/authRoutes"));

//** admin routes */
app.use("/api/admin", require("./routes/adminRoutes"));

//** note routes */
app.use("/api/notes", require("./routes/noteRoutes"))

module.exports = app;