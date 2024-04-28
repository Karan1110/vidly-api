const Joi = require("joi");
const mongoose = require("mongoose");
const { genreSchema } = require("./genre");
const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 255,
  },
  description: {
    type: String,
    required: true,
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
  price: {
    type: Number,
    required: true,
    min: 100,
    max: 1000,
  },
  video: String,
  cover: String,
  averageRating: {
    type: Number,
    default: 0,
    required: false,
  },
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
  languages: {
    type: [String],
    default: ["English"],
    required: false,
  },
  ageLimit: {
    type: Number,
    default: 8,
    required: false,
  },
  cast: {
    type: [String],
    required: true,
  },
  releasedOn: {
    type: Date,
    required: true,
  },
});

const Movie = mongoose.model("Movies", movieSchema);

function validateMovie(movie) {
  const schema = {
    title: Joi.string().min(5).max(50).required(),
    genreId: Joi.objectId().required(),
    numberInStock: Joi.number().min(0).required(),
    ageLimit: Joi.number(),
    languages: Joi.array(Joi.string()),
    video: joi.required(),
    cover: Joi.required(),
  };

  return Joi.validate(movie, schema);
}

exports.Movie = Movie;
exports.validate = validateMovie;
exports.movieSchema = movieSchema;
