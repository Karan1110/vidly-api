const router = require("express").Router();
const List = require("../models/list");
const auth = require("../middleware/auth");
const isadmin = require("../middleware/admin");

//CREATE
//isadmin
router.post("/", [auth], async (req, res) => {
  try {
    const newList = new List(req.body);
    const savedList = await newList.save();
    res.status(201).json(savedList);
  } catch (err) {
    res.status(500).json(err);
  }
});

//DELETE

router.delete("/:id", auth, async (req, res) => {
  try {
    await List.findByIdAndDelete(req.params.id);
    res.status(201).json("The list has been delete...");
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET

router.get("/", auth, async (req, res) => {
  const genreQuery = req.query.genre;
  let lists = [];
  try {
    if (genreQuery) {
      lists = await List.aggregate([
        { $sample: { size: 10 } },
        { $match: { genre: genreQuery } },
      ]);
    } else {
      lists = await List.aggregate([{ $sample: { size: 10 } }]);
    }
    res.status(200).json(lists);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
