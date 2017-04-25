const mysql = require("mysql"),
  log = require("./log.js");

const config = require("./../config.json")

exports.connect = function(cb) {
  log.info("connecting to database");

  let connection = mysql.createConnection(config.database)
  connection.connect(function(err) {
    if (err) {
      log.error("failed to connect to database: " + err.code);
    } else {
      log.info("connected to database");
      cb()
    }
  });

  exports.connection = connection
}

exports.query = function(...params) {
  exports.connection.query(...params);
}
