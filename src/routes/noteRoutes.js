const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const noteController = require("../controllers/noteController");

router.use(authenticate);

router.get("/", noteController.listMine);
router.post("/", noteController.create);
router.get("/:id", noteController.getOne);
router.put("/:id", noteController.update);
router.delete("/:id", noteController.remove);

module.exports = router;