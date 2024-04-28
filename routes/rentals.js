const { Rental, validate } = require("../models/rental");
const { Movie } = require("../models/movie");
const { User } = require("../models/user");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const Fawn = require("fawn");
const config = require("config");
const express = require("express");
const router = express.Router();
mongoose.connect(config.get("db"));
Fawn.init(mongoose);

router.get("/", auth, async (req, res) => {
  const rentals = await Rental.find().select("-__v").sort("-createdAt");
  res.send(rentals);
});

router.get("/users/:id", async (req, res) => {
  const rentals = await Rental.find({
    "user._id": req.params.id,
  })
    .sort("-createdAt")
    .select("-__v");
  res.json(rentals);
});

router.get("/moviePrice/:movieId/:userId", async (req, res) => {
  const movie = await Movie.findById(req.params.movieId);
  const user = await User.findById(req.params.userId);
  let rentalFee = movie.price;

  if (user.points > 51) {
    rentalFee = movie.price * (98 / 100);
  } else if (user.points < 50 && user.points > 76) {
    rentalFee = movie.price * (95 / 100);
  } else if (user.points < 100) {
    rentalFee = movie.price * (90 / 100);
  } else if (user.points < 150) {
    rentalFee = movie.price * (85 / 100);
  } else if (user.points < 200) {
    rentalFee = movie.price * (80 / 100);
  }

  res.send(rentalFee);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await User.findById(req.body.userId);
  if (!user) return res.status(400).send("Invalid user.");

  const movie = await Movie.findById(req.body.movieId);
  if (!movie) return res.status(400).send("Invalid movie.");

  let rental = new Rental({
    user: {
      _id: user._id,
      name: user.name,
      phone: user.phone,
    },
    movie: {
      _id: movie._id,
      title: movie.title,
      description: movie.description,
    },
    rentalFee: req.body.rentalFee,
  });

  user.movies.push(movie);
  user.points = user.points + 2;
  await user.save();

  try {
    await new Fawn.Task()
      .save("rentals", rental)
      .run();

    res.send(rental);
  } catch (ex) {
    res.status(500).send("Something failed.");
  }
});

router.get("/:id", [auth], async (req, res) => {
  const rental = await Rental.findById(req.params.id).select("-__v");

  if (!rental)
    return res.status(404).send("The rental with the given ID was not found.");

  res.send(rental);
});

module.exports = router;
