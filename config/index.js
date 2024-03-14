"use strict";

const _ = require("lodash");
const env = process.env.NODE_ENV || "local";
const envConfig = require(`./${env}`);

let detaultConfig = {
  env: env,
}; 

module.exports = _.merge(detaultConfig, envConfig);
