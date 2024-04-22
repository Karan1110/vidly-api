const express = require("express");
const genres = require("../routes/genres.js");
const movies = require("../routes/movies.js");
const rentals = require("../routes/rentals.js");
const users = require("../routes/users.js");
const auth = require("../routes/auth");
const returns = require("../routes/returns.js");
const error = require("../middleware/error.js");
const path = require("path");

module.exports = function (app) {
  app.use(express.static(path.join(__dirname, "../uploads")));
  app.use(express.json());
  app.use("/api/genres", genres);
  app.use("/api/movies", movies);
  app.use("/api/rentals", rentals);
  app.use("/api/users", users);
  app.use("/api/auth", auth);
  app.use("/api/returns", returns);
  app.use(error);
};
