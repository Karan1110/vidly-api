const { Movie, validate } = require("../models/movie")
const { Genre } = require("../models/genre")
const auth = require("../middleware/auth")
const admin = require("../middleware/admin")
const validateObjectId = require("../middleware/validateObjectId")
const moment = require("moment")
const mongoose = require("mongoose")
const express = require("express")
const multer = require("multer")
const router = express.Router()
const { User } = require("../models/user.js")
const path = require("path")

router.get("/", async (req, res) => {
  const movies = await Movie.find().select("-__v").sort("name")
  res.send(movies)
})

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
  ])

  if (mostLikedMovie.length === 0)
    return res.status(404).send("No movies found")

  res.status(200).send(mostLikedMovie)
})

router.get("/search", auth, async (req, res) => {
  try {
    console.log("karan!!")
    if (typeof req.query.title !== "string" || req.query.title.trim() === "") {
      return res.status(400).send("Invalid title parameter")
    }

    let movies

    if (req.query.title) {
      movies = await Movie.find({ title: req.query.title })
    } else if (req.query.dailyRentalRate) {
      movies = await Movie.find({
        dailyRentalRate: { $gte: req.query.dailyRentalRate },
      })
    } else {
      return res.status(400).send("Invalid search parameters")
    }

    if (movies.length === 0) {
      return res.status(404).send("No movies found matching the criteria.")
    }

    res.send(movies)
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error")
  }
})
router.get("/:id", validateObjectId, async (req, res) => {
  console.log("karan1")
  const movie = await Movie.findById(req.params.id).select("-__v")

  if (!movie)
    return res.status(404).send("The movie with the given ID was not found.")

  res.send(movie)
})

router.get("/rating/:id", validateObjectId, async (req, res) => {
  console.log("karan2")
  const movie = await Movie.findById(req.params.id).select("-__v")

  if (!movie) {
    return res.status(404).send("The movie with the given ID was not found.")
  }

  const totalRatings = movie.ratings.length

  if (totalRatings === 0) {
    return res.status(200).send({ averageRating: 0, totalRatings: 0 })
  }

  const sumOfRatings = movie.ratings.reduce(
    (accumulator, currentRating) => accumulator + currentRating.rating,
    0
  )

  const averageRating = sumOfRatings / totalRatings

  res.status(200).send({ averageRating, totalRatings })
})

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../", "/uploads")) // Specify the destination folder
  },
  filename: function (req, file, cb) {
    // Preserve the original extension of the file
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + ext)
  },
})

// Set up the multer middleware with the custom storage engine
const upload = multer({ storage: storage })

router.post(
  "/",
  [
    auth,
    upload.fields([
      { name: "cover", maxCount: 1 },
      { name: "trailer", maxCount: 1 },
    ]),
  ],
  async (req, res) => {
    try {
      const { error } = validate(req.body)
      if (error) return res.status(400).send(error.details[0].message)

      const genre = await Genre.findById(req.body.genreId)
      if (!genre) return res.status(400).send("Invalid genre.")

      // Check if file is present
      if (!req.files || !req.files["cover"] || !req.files["trailer"]) {
        return res.status(400).send("cover file is  required.")
      }
      console.log(req.files["cover"][0].filename)
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
        cover: req.files["cover"][0].filename,
        trailer: req.files["trailer"][0].filename,
      })

      await movie.save()
      res.send(movie)
    } catch (error) {
      console.error("Error creating movie:", error)
      res.status(500).send("Internal Server Error")
    }
  }
)

router.put(
  "/:id",
  [
    auth,
    upload.fields([
      { name: "cover", maxCount: 1 },
      { name: "trailer", maxCount: 1 },
    ]),
  ],
  async (req, res) => {
    try {
      const { error } = validate(req.body)
      if (error) return res.status(400).send(error.details[0].message)

      const genre = await Genre.findById(req.body.genreId)
      if (!genre) return res.status(400).send("Invalid genre.")

      // Check if file is present
      if (!req.files || !req.files["cover"] || !req.files["trailer"]) {
        return res
          .status(400)
          .send("Both cover and trailer files are required.")
      }

      const updatedMovie = {
        title: req.body.title,
        genre: {
          _id: genre._id,
          name: genre.name,
        },
        numberInStock: req.body.numberInStock,
        dailyRentalRate: req.body.dailyRentalRate,
        cover: req.files["cover"][0].filename,
        trailer: req.files["trailer"][0].filename,
      }

      const movie = await Movie.findByIdAndUpdate(req.params.id, updatedMovie, {
        new: true,
      })

      if (!movie)
        return res
          .status(404)
          .send("The movie with the given ID was not found.")

      res.send(movie)
    } catch (error) {
      console.error("Error updating movie:", error)
      res.status(500).send("Internal Server Error")
    }
  }
)

router.delete("/:id", [auth, admin], async (req, res) => {
  const movie = await Movie.findByIdAndRemove(req.params.id)

  if (!movie)
    return res.status(404).send("The movie with the given ID was not found.")

  res.send(movie)
})

router.post("/watchlist/add", auth, async (req, res) => {
  const movie = await Movie.findById(req.body.movie_id)
  if (!movie) return res.status(400).send("movie not found")
  const user = await User.findById(req.user._id)
  user.watchlist.push(movie)
  await user.save()
  res.status(200).send("movie added to your watchlist!")
})

router.post("/ratings/add", auth, async (req, res) => {
  const movie = await Movie.findById(req.body.movie_id)

  if (!movie) {
    return res.status(400).send("Movie not found")
  }

  const newRating = {
    rating: req.body.rating,
    review: req.body.review,
    user: req.user.name, // Assuming you have a way to identify the user
  }

  movie.ratings.push(newRating)
  await movie.save()

  res.status(200).send("The movie rating has been added.")
})

router.post("/watchlist/remove", auth, async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) return res.status(400).send("User not found")
  const movie = user.watchlist.id(req.body.movie_id)
  if (!movie) return res.status(400).send("Movie not in watchlist")
  movie.remove()
  await user.save()
  res.status(200).send("Movie removed from your watchlist!")
})

router.post("/like/add", auth, async (req, res) => {
  const movie = await Movie.findOneAndUpdate(
    { _id: req.body.movie_id },
    { $inc: { likes: 1 } },
    { new: true } // Return the updated document
  )
  if (!movie) return res.status(404).send("Movie not found")
  res.status(200).send("Like added to the movie!")
})

router.post("/like/remove", auth, async (req, res) => {
  const movie = await Movie.findOneAndUpdate(
    { _id: req.body.movie_id },
    { $inc: { likes: -1 } },
    { new: true } // Return the updated document
  )
  if (!movie) return res.status(404).send("Movie not found")
  res.status(200).send("Like removed from the movie!")
})

module.exports = router
