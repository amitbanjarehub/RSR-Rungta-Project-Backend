"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");
const multer = require("multer");

const createDbPool = require("../config/db");
const errorMiddleware = require("./middlewares/errorMiddleware");

module.exports = function () {
  let server = express();
  let create;
  let start;

  create = function (config, db) {
    let routes = require("./routes");

    server.set("env", config.env);
    server.set("port", config.port);
    server.set("hostname", config.hostname);

    server.use(cors());
    server.use(bodyParser.json());
    server.use(bodyParser.urlencoded({ extended: false }));
    server.use(cookieParser());
    server.use(logger("dev"));
    server.use(passport.initialize());
    server.use(multer().none());
    createDbPool(server);
    routes.init(server);

    server.use(errorMiddleware);
  };

  start = function () {
    let hostname = server.get("hostname");
    let port = server.get("port");
    server.listen(port, function () {
      console.log(
        "Express server listening on - http://" + hostname + ":" + port
      );
    });
  };

  return {
    db: server.get("db"),
    create: create,
    start: start,
  };
};
