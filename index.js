const winston = require("winston");
const express = require("express");
const config = require("config");
const app = express();
const Joi = require("joi");

Joi.objectId = require("joi-objectid")(Joi);
require("./startup/logging")();
require("./utils/cors")(app);
require("./utils/config")();
require("./startup/routes")(app);
require("./startup/db")();

const port = process.env.PORT || config.get("port");
const server = app.listen(port, () =>
  winston.info(`Listening on port ${port}...`)
);

module.exports = server;
