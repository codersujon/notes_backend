const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const noteController = require("../controllers/noteController");

router.use(authenticate, authorize("admin"));

router.get("/notes", noteController.listAll);

module.exports = router;