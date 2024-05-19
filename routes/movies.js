const { Movie, validate } = require("../models/movie");
const { Genre } = require("../models/genre");
const auth = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");
const mongoose = require("mongoose");
const express = require("express");
const multer = require("multer");
const router = express.Router();
const { User } = require("../models/user.js");
const uploader = require("../utils/uploader");
const storage = multer.memoryStorage();
const { Rental } = require("../models/rental.js");
const upload = multer({ storage: storage });
const { v4: uuidv4 } = require("uuid");

router.get("/", async (req, res) => {
  const movies = await Movie.find().select("-__v").sort("-createdAt");
  res.send(movies);
});
router.get("/trending", async (req, res) => {
  try {
    // Define the start date of the time frame for trending movies (e.g., past week)
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Aggregate rentals within the defined time frame
    const trendingMovies = await Rental.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }, // Filter rentals within the time frame
        },
      },
      {
        $group: {
          _id: "$movie._id",
          rentalCount: { $sum: 1 }, // Count the number of rentals for each movie
        },
      },
      {
        $sort: { rentalCount: -1 }, // Sort movies by rental count in descending order
      },
    ]);

    const movies = trendingMovies.map((m) => m.movie);

    res.json(movies);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// todo 
router.get("random",async (req,res)=>{
  const movies = await Movie.aggregate([
   { $sample : {
      size: 10
    }
    }
  ]);
  res.json(movies);
})
router.get("/genres", async (req, res) => {
  const movies = await Movie.find({
    "genre.name": new RegExp(req.query.genre),
  })
    .sort("-createdAt")
    .select("-video");
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
    upload.fields([{ name: "thumbnail", maxCount: 1 }, { name: "video" }]),
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
    if (!req.files || !req.files["thumbnail"] || !req.files["video"]) {
      return res
        .status(400)
        .send("thumbnail file and video file are required.");
    }

    const thumbnailFile = req.files["thumbnail"][0];
    const videoFile = req.files["video"][0];

    const thumbnailPublicId = uuidv4() + "_thumbnail_" + req.body.title;
    const videoPublicId = uuidv4() + "_video_" + req.body.title;

    const thumbnailURL = await uploader(thumbnailFile, thumbnailPublicId);
    const videoURL = await uploader(videoFile, videoPublicId, "video");

    let movie = new Movie({
      _id: mongoose.Types.ObjectId(),
      title: req.body.title,
      description: req.body.description,
      genre,
      thumbnail: thumbnailURL,
      video: videoURL,
      ageLimit: req.body.ageLimit,
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

  movie.ratings.push(newRating);
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
``
  movie.averageRating = averageRating;
  await movie.save();

  res.status(200).send("your  rating has been added.");
});
// todo
router.post("/watchlist/remove", auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(400).send("User not found");
  const movie = user.watchlist.id(req.body.movie_id);
  if (!movie) return res.status(400).send("Movie not in watchlist");
  movie.remove();
  await user.save();
  res.status(200).send("Movie removed from your watchlist!");
});

router.put(
  "/:id",
  [
    auth,
    upload.fields([
      { name: "thumbnail", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
  ],
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const genre = await Genre.findById(req.body.genreId);
    if (!genre) return res.status(400).send("Invalid genre.");

    // Check if file is present
    if (!req.files || !req.files["thumbnail"] || !req.files["video"]) {
      return res
        .status(400)
        .send("Both thumbnail and video files are required.");
    }

    const updatedMovie = {
      title: req.body.title,
      genre: {
        _id: genre._id,
        name: genre.name,
      },
      ageLimit: req.body.ageLimit,
    };

    const thumbnailFile = req.files["thumbnail"][0];
    const videoFile = req.files["video"][0];

    const thumbnailPublicId = uuidv4() + "_thumbnail_" + req.body.title;
    const videoPublicId = uuidv4() + "_video_" + req.body.title;

    const thumbnailURL = uploader(thumbnailFile, thumbnailPublicId);
    const videoURL = uploader(videoFile, videoPublicId, "video");

    // Update movie document with the new file names
    updatedMovie.thumbnail = thumbnailURL;
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