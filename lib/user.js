const database = require("./database.js"),
  log = require("./log.js"),
  crypto = require("./crypto.js"),
  fs = require("fs"),
  forge = require("node-forge");

let storedTokens = [];

class User {
  constructor(uid) {

  }

  create(username, publicKey, privateKey, cb) {
    username = username.toLowerCase().trim();

    database.query("SELECT COUNT(*) AS count FROM users WHERE `username`=?", [username], function(err, results) {
      if (results[0].count > 0) {
        return cb(new Error("A user already exists with that username"));
      }

      database.query("INSERT INTO users(username, last_login) VALUES(?, NOW())", [username], function(err, data) {
        var userId = data.insertId;

        var publicKeyString = JSON.stringify(publicKey);
        database.query("INSERT INTO user_keys(userid, public_key, private_key) VALUES(?, ?, ?)", [userId, publicKey, privateKey]);
        fs.mkdirSync("email_store/" + userId);

        cb(null, userId);
      });
    });
  }

  load(uid, callback) {
    if (uid !== false) {
      let selectClause = "users.id=?"
      if (typeof(uid) == "string") {
        selectClause = "`username`=?"
      }

      database.query("SELECT username, storage_limit, last_login, users.id AS id, private_key, public_key FROM users, user_keys WHERE " + selectClause + " AND user_keys.userid = users.id", [uid], (err, results) => {
        if (results && results[0] && results[0].id) {
          log.info("loaded data for " + results[0].username);

          this.id = results[0].id
          this.username = results[0].username
          this.storage_limit = results[0].storage_limit
          this.last_login = results[0].last_login

          this.keys = {};
          this.keys.private = results[0].private_key
          this.keys.public_pem = results[0].public_key

          crypto.importPublicKey(results[0].public_key, (err, publicKey) => {
            this.keys.public = publicKey;

            callback(null, true);
          });

        } else {
          log.info("user not found")
          callback(null, false);
        }
      });
    }
  }

  generateLoginChallenge(username, cb) {
    if (this.username) {
      crypto.randomBytes(64, (err, buf) => {
        let login_token = buf.toString("base64")
        storedTokens[this.id] = login_token;
        crypto.encryptRSA(this.keys.public, login_token, function(err, data) {
            cb(null, login_token, data);
        });
      });

    } else {
      this.load(username, (err, found) => {
        if (found) {
          this.generateLoginChallenge(username, cb);
        } else {
          cb(null, false);
        }
      });
    }
  }

  doLogin(response, cb) {
    if (this.username && storedTokens[this.id]) {
      if (response == storedTokens[this.id]) {
        database.query("UPDATE `users` SET `last_login`=NOW() WHERE `id`=?", [this.id]);
        cb(null, true);
      } else {
        cb(new Error("Invalid username or password"));
      }
    }
  }

  static exists(username, cb) {
    database.query("SELECT COUNT(*) AS count FROM `users` WHERE `username`=?", [username], (err, results) => {
      cb(err, (results[0] && results[0].count > 0))
    });
  }

 }

module.exports = User
