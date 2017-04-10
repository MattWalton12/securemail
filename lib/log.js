const colors = require("colors");

const logTypes = {
  info: colors.blue,
  error: colors.red,
  warn: colors.yellow,
  debug: colors.grey
}

exports.log = function(type, message) {
  console.log(logTypes[type]("[" + type + "]"), message);
}

exports.debug = function(msg) {
  exports.log("debug", msg);
}

exports.info = function(msg) {
  exports.log("info", msg);
}

exports.error = function(msg) {
  exports.log("error", msg);
}

exports.warn = function(msg) {
  exports.log("warn", msg);
}
