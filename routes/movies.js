require("events").EventEmitter.defaultMaxListeners = 15;
const path = require("path");
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
const admin = require("firebase-admin");
const serviceAccount = require(path.join(
  __dirname,
  "../karanstore-2c850-firebase-adminsdk-5ry9v-ff376d22e0.json"
));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "karanstore-2c850.appspot.com",
});

const bucket = admin.storage().bucket();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/", async (req, res) => {
  const movies = await Movie.find().select("-__v").sort("name");
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

router.get("/search", auth, async (req, res) => {
  try {
    console.log("karan!!");
    if (typeof req.query.title !== "string" || req.query.title.trim() === "") {
      return res.status(400).send("Invalid title parameter");
    }

    let movies;

    if (req.query.title) {
      movies = await Movie.find({ title: req.query.title });
    } else if (req.query.dailyRentalRate) {
      movies = await Movie.find({
        dailyRentalRate: { $gte: req.query.dailyRentalRate },
      });
    } else {
      return res.status(400).send("Invalid search parameters");
    }

    if (movies.length === 0) {
      return res.status(404).send("No movies found matching the criteria.");
    }

    res.send(movies);
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

router.get("/rating/:id", validateObjectId, async (req, res) => {
  console.log("karan2");
  const movie = await Movie.findById(req.params.id).select("-__v");

  if (!movie) {
    return res.status(404).send("The movie with the given ID was not found.");
  }

  const totalRatings = movie.ratings.length;

  if (totalRatings === 0) {
    return res.status(200).send({ averageRating: 0, totalRatings: 0 });
  }

  const sumOfRatings = movie.ratings.reduce(
    (accumulator, currentRating) => accumulator + currentRating.rating,
    0
  );

  const averageRating = sumOfRatings / totalRatings;

  res.status(200).send({ averageRating, totalRatings });
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
    try {
      const { error } = validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);

      const genre = await Genre.findById(req.body.genreId);
      if (!genre) return res.status(400).send("Invalid genre.");

      // Check if file is present
      if (!req.files || !req.files["cover"] || !req.files["video"]) {
        return res.status(400).send("Cover file and video file are required.");
      }

      const coverFile = req.files["cover"][0];
      const trailerFile = req.files["video"][0];

      // Upload files to Firebase Storage in specific directories
      const coverFileName = `${Date.now()}_${coverFile.originalname}`;
      const trailerFileName = `${Date.now()}_${trailerFile.originalname}`;

      const coverUpload = bucket.file(`images/${coverFileName}`);
      const trailerUpload = bucket.file(`videos/${trailerFileName}`);

      await Promise.all([
        coverUpload.save(coverFile.buffer),
        trailerUpload.save(trailerFile.buffer),
      ]);

      const [coverURL] = await coverUpload.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });
      const [trailerURL] = await trailerUpload.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      const movie = new Movie({
        _id: mongoose.Types.ObjectId(),
        title: req.body.title,
        genre: {
          _id: genre._id,
          name: genre.name,
        },
        numberInStock: parseInt(req.body.numberInStock),
        dailyRentalRate: parseInt(req.body.dailyRentalRate),
        publishDate: moment().toJSON(),
        cover: coverURL,
        video: trailerURL,
      });

      await movie.save();
      res.send(movie);
    } catch (error) {
      console.error("Error creating movie:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

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
    try {
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
        numberInStock: req.body.numberInStock,
        dailyRentalRate: req.body.dailyRentalRate,
      };

      // Upload updated files to Firebase Storage
      const coverFile = req.files["cover"][0];
      const trailerFile = req.files["video"][0];

      const coverFileName = `${Date.now()}_${coverFile.originalname}`;
      const trailerFileName = `${Date.now()}_${trailerFile.originalname}`;

      const coverUpload = bucket.file(`images/${coverFileName}`);
      const trailerUpload = bucket.file(`videos/${trailerFileName}`);

      await Promise.all([
        coverUpload.save(coverFile.buffer),
        trailerUpload.save(trailerFile.buffer),
      ]);

      // Update movie document with the new file names
      updatedMovie.cover = coverFileName;
      updatedMovie.video = trailerFileName;

      const movie = await Movie.findByIdAndUpdate(req.params.id, updatedMovie, {
        new: true,
      });

      if (!movie)
        return res
          .status(404)
          .send("The movie with the given ID was not found.");

      res.send(movie);
    } catch (error) {
      console.error("Error updating movie:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

router.delete("/:id", [auth, adminMiddleware], async (req, res) => {
  const movie = await Movie.findByIdAndRemove(req.params.id);

  if (!movie)
    return res.status(404).send("The movie with the given ID was not found.");

  res.send(movie);
});

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

  const newRating = {
    rating: req.body.rating,
    review: req.body.review,
    user: req.user.name, // Assuming you have a way to identify the user
  };

  movie.ratings.push(newRating);
  await movie.save();

  res.status(200).send("The movie rating has been added.");
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

module.exports = router;
