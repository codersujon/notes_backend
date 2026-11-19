const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const noteController = require("../controllers/noteController");
const adminController = require("../controllers/adminController");

router.use(authenticate, authorize("admin"));

router.get("/notes", noteController.listAll);

router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;