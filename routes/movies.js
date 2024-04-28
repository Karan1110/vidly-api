require("events").EventEmitter.defaultMaxListeners = 15;
const { Movie, validate } = require("../models/movie");
const { Genre } = require("../models/genre");
const auth = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");
const moment = require("moment");
const mongoose = require("mongoose");
const express = require("express");
const multer = require("multer");
const router = express.Router();
const { User } = require("../models/user.js");
const uploader = require("../utils/uploader");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { v4: uuidv4 } = require("uuid");

router.get("/", async (req, res) => {
  const movies = await Movie.find().select("-__v").sort("-createdAt");
  res.send(movies);
});

router.get("/random", async (req, res) => {
  const movies = await Movie.aggregate([
    {
      $match: {
        "genre.name": req.query.genre,
      },
    },
    {
      $sample: {
        size: 50,
      },
    },
  ]);
  res.json(movies);
});

router.get("/mostLiked", auth, async (req, res) => {
  const mostLikedMovie = await Movie.aggregate([
    {
      $sort: {
        likes: -1, // Sort in descending order based on the 'likes' field
      },
    },
    {
      $limit: 100, // Take only the topmost result
    },
  ]);

  if (mostLikedMovie.length === 0)
    return res.status(404).send("No movies found");

  res.status(200).send(mostLikedMovie);
});

router.get("/highlyRated", auth, async (req, res) => {
  const movies = await Movie.find({
    ageLimit: {
      $lte: req.user.age,
    },
  })
    .sort("-averageRating")
    .select("-__v");

  res.json(movies);
});

router.get("/search", auth, async (req, res) => {
  try {
    const movies = await Movie.find({
      $or: [
        { title: new RegExp(req.query.search, "i") },
        { description: new RegExp(req.query.search, "i") },
        { cast: { $elemMatch: { $eq: req.query.search } } },

        { "genre.name": new RegExp(req.query.search, "i") },
        { price: new RegExp(req.query.search, "i") },
      ],
    }).select("-video");
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/:id", validateObjectId, async (req, res) => {
  console.log("karan1");
  const movie = await Movie.findById(req.params.id).select("-__v");

  if (!movie)
    return res.status(404).send("The movie with the given ID was not found.");

  res.send(movie);
});

router.post(
  "/",
  [
    auth,
    upload.fields([
      { name: "cover", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
  ],
  async (req, res) => {
    // const { error } = validate(req.body);
    // if (error) return res.status(400).send(error.details[0].message);

    const genre = await Genre.findById(req.body.genreId).select({
      _id: 1,
      name: 1,
    });

    if (!genre) return res.status(400).send("Invalid genre.");

    // Check if file is present
    if (!req.files || !req.files["cover"] || !req.files["video"]) {
      return res.status(400).send("Cover file and video file are required.");
    }

    const coverFile = req.files["cover"][0];
    const videoFile = req.files["video"][0];

    const coverPublicId = uuidv4() + "_cover_" + req.body.title;
    const videoPublicId = uuidv4() + "_video_" + req.body.title;

    const coverURL = uploader(coverFile, coverPublicId);
    const videoURL = uploader(videoFile, videoPublicId, "video");

    let movie = new Movie({
      _id: mongoose.Types.ObjectId(),
      title: req.body.title,
      description: req.body.description,
      genre,
      cover: coverURL,
      video: videoURL,
      ageLimit: req.body.ageLimit,
      releasedOn: req.body.releasedOn,
      price: req.body.price,
    });

    movie = await movie.save();
    res.send(movie);
  }
);

router.post("/watchlist/add", auth, async (req, res) => {
  let movie = await Movie.findById(req.body.movie_id);
  if (!movie) return res.status(400).send("movie not found");
  const user = await User.findById(req.user._id);
  delete movie.video;
  user.watchlist.push(movie);
  await user.save();
  res.status(200).send("movie added to your watchlist!");
});

router.post("/ratings/add", auth, async (req, res) => {
  const movie = await Movie.findById(req.body.movie_id);

  if (!movie) {
    return res.status(400).send("Movie not found");
  }
  let averageRating = 0;

  const newRating = {
    rating: req.body.rating,
    review: req.body.review,
    user: req.user.name, // Assuming you have a way to identify the user
  };

  const totalRatings = movie.ratings.length;

  if (totalRatings === 0) {
    const sumOfRatings = movie.ratings.reduce(
      (accumulator, currentRating) => accumulator + currentRating.rating,
      0
    );

    averageRating = sumOfRatings / totalRatings;
  } else {
    return;
  }

  movie.ratings.push(newRating);
  movie.averageRating = averageRating;
  await movie.save();

  res.status(200).send("your  rating has been added.");
});

router.post("/watchlist/remove", auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(400).send("User not found");
  const movie = user.watchlist.id(req.body.movie_id);
  if (!movie) return res.status(400).send("Movie not in watchlist");
  movie.remove();
  await user.save();
  res.status(200).send("Movie removed from your watchlist!");
});

router.post("/like/add", auth, async (req, res) => {
  const movie = await Movie.findOneAndUpdate(
    { _id: req.body.movie_id },
    { $inc: { likes: 1 } },
    { new: true } // Return the updated document
  );
  if (!movie) return res.status(404).send("Movie not found");
  res.status(200).send("Like added to the movie!");
});

router.post("/like/remove", auth, async (req, res) => {
  const movie = await Movie.findOneAndUpdate(
    { _id: req.body.movie_id },
    { $inc: { likes: -1 } },
    { new: true } // Return the updated document
  );
  if (!movie) return res.status(404).send("Movie not found");
  res.status(200).send("Like removed from the movie!");
});

router.put(
  "/:id",
  [
    auth,
    upload.fields([
      { name: "cover", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
  ],
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const genre = await Genre.findById(req.body.genreId);
    if (!genre) return res.status(400).send("Invalid genre.");

    // Check if file is present
    if (!req.files || !req.files["cover"] || !req.files["video"]) {
      return res.status(400).send("Both cover and video files are required.");
    }

    const updatedMovie = {
      title: req.body.title,
      genre: {
        _id: genre._id,
        name: genre.name,
      },
      ageLimit: req.body.ageLimit,
    };

    const coverFile = req.files["cover"][0];
    const videoFile = req.files["video"][0];

    const coverPublicId = uuidv4() + "_cover_" + req.body.title;
    const videoPublicId = uuidv4() + "_video_" + req.body.title;

    const coverURL = uploader(coverFile, coverPublicId);
    const videoURL = uploader(videoFile, videoPublicId, "video");

    // Update movie document with the new file names
    updatedMovie.cover = coverURL;
    updatedMovie.video = videoURL;

    const movie = await Movie.findByIdAndUpdate(req.params.id, updatedMovie, {
      new: true,
    });

    if (!movie)
      return res.status(404).send("The movie with the given ID was not found.");

    res.send(movie);
  }
);

router.delete("/:id", [auth, adminMiddleware], async (req, res) => {
  const movie = await Movie.findByIdAndRemove(req.params.id);

  if (!movie)
    return res.status(404).send("The movie with the given ID was not found.");

  res.send(movie);
});

module.exports = router;
