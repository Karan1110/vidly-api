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
  price: {
    type: Number,
    required: true,
    min: 100,
    max: 1000,
  },
  video: String,
  thumbnail: String,
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
        user: {
          type: String,
          unique: true,
        },
      }),
    ],
    required: false,
  },

  ageLimit: {
    type: Number,
    default: 8,
    required: false,
  },
});

const Movie = mongoose.model("Movies", movieSchema);

function validateMovie(movie) {
  const schema = {
    title: Joi.string().min(5).max(50).required(),
    description: Joi.string(),
    genreId: Joi.objectId().required(),
    ageLimit: Joi.number(),
    price: Joi.number(),
    video: Joi.required(),
    thumbnail: Joi.required(),
  };

  return Joi.validate(movie, schema);
}

exports.Movie = Movie;
exports.validate = validateMovie;
exports.movieSchema = movieSchema;
