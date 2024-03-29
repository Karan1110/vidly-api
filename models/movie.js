const Joi = require("joi")
const mongoose = require("mongoose")
const { genreSchema } = require("./genre")
const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 255,
  },
  genre: {
    type: genreSchema,
    required: true,
  },
  numberInStock: {
    type: Number,
    required: true,
    min: 0,
    max: 255,
  },
  dailyRentalRate: {
    type: Number,
    required: true,
    min: 0,
    max: 255,
  },
  video: String,
  cover: String,
  likes: {
    type: Number,
    min: 0,
    default: 0,
    required: false,
  },
  ratings: {
    type: [
      new mongoose.Schema({
        rating: Number,
        review: String,
        user: String,
      }),
    ],
    required: false,
  },
})
const Movie = mongoose.model("Movies", movieSchema)

function validateMovie(movie) {
  const schema = {
    title: Joi.string().min(5).max(50).required(),
    genreId: Joi.objectId().required(),
    numberInStock: Joi.number().min(0).required(),
    dailyRentalRate: Joi.number().min(0).required(),
  }

  return Joi.validate(movie, schema)
}

exports.Movie = Movie
exports.validate = validateMovie
exports.movieSchema = movieSchema
