const winston = require("winston");
const mongoose = require("mongoose");
const config = require("config");

module.exports = function connectToDatabase() {
  const db = config.get("db");

  function attemptConnection() {
    mongoose
      .connect("mongodb://localhost:27017/netflix")
      .then(() => {
        winston.info(`Connected to db...`);
      })
      .catch((ex) => {
        winston.error(`Error connecting to db... ${ex}`);
        // Retry connection after a delay (e.g., 5 seconds)
        setTimeout(attemptConnection, 5000); // Adjust the delay as needed
      });
  }

  // Initial connection attempt
  attemptConnection();
};
