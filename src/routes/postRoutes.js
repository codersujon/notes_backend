const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const c = require("../controllers/postController");

router.use(authenticate);

router.post("/posts", c.create);
router.get("/users/grouped-by-interests", c.groupedByInterests);
router.get("/users/:id/posts", c.byUser);

module.exports = router;