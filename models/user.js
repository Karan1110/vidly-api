const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");
const { movieSchema } = require("./movie");
const genreSchema = require("./genre");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  },
  isAdmin: Boolean,
  watchlist: [
    new mongoose.Schema({
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
      thumbnail: String,
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
    }),
  ],
  isGold: {
    type: Boolean,
    default: false,
    required: false,
  },
  points: {
    type: Number,
    default: 0,
    required: false,
  },
  movies: [movieSchema],
  age: {
    type: Number,
    default: 18,
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      isAdmin: this.isAdmin,
      age: this.age,
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
    age: Joi.number().required(),
  };

  return Joi.validate(user, schema);
}

exports.User = User;
exports.validate = validateUser;
exports.userSchema = userSchema;
