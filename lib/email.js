const database = require("./database.js"),
  crypto = require("./crypto.js"),
  ncrypto = require("crypto"),
  config = require("./../config.json")
  fs = require("fs");

exports.list = function(user, start, amount, search, type, cb) {
  function dbCallback(err, emails) {
    database.query("SELECT COUNT(*) AS count FROM emails WHERE marked_read=0 AND userid=? AND type=1 AND spam_status=0", [user.id], function(err, res) {
      if (res[0] && res[0].count) {
        cb(null, emails, res[0].count)
      }
    });
  }

  if (search.length > 0) {
    if (search.indexOf("tag:") > -1) {
      let tag = search.split("tag:")[1]

      if (tag == "spam") {
        database.query("SELECT id, subject, email, name, UNIX_TIMESTAMP(date) AS date, marked_read FROM emails WHERE userid=? AND type=? AND spam_status = 1 ORDER BY date DESC LIMIT ?, ?", [user.id, type, start, start+amount], dbCallback)
      } else {
        tag = parseInt(tag)

        if (tag) {

          database.query("SELECT emails.id AS id, subject, email, name, UNIX_TIMESTAMP(date) AS date FROM emails, email_tags WHERE email_tags.tag_id=? AND emails.id=email_tags.email_id AND emails.type=? AND emails.spam_status=0 ORDER BY date DESC LIMIT ?, ?",
          [tag, type, start, start+amount], dbCallback)
        } else {
          cb(new Error("Invalid tag"))
        }
      }
    } else {
      search = "%" + search + "%"
      database.query("SELECT id, subject, email, name, UNIX_TIMESTAMP(date) AS date, marked_read FROM emails WHERE userid=? AND type=? AND spam_status=0 AND (subject LIKE ? OR name LIKE ? OR email LIKE ?) ORDER BY date DESC LIMIT ?, ?",
        [user.id, type, search, search, search, start, start+amount], dbCallback)
    }
  } else {
    database.query("SELECT id, subject, email, name, UNIX_TIMESTAMP(date) AS date, marked_read FROM emails WHERE userid=? AND type=? AND spam_status=0 ORDER BY date DESC LIMIT ?, ?", [user.id, type, start, start+amount], dbCallback)
  }

}

exports.retrieve = function(user, id, cb) {
  id = parseInt(id);

  if (id) {
    database.query("SELECT id, subject, email, UNIX_TIMESTAMP(date) AS date, encrypted_key FROM emails WHERE userid=? AND id=?", [user.id, id], function(err, email) {
      if (email && email[0]) {
        email = email[0];

        database.query("SELECT tag_id FROM email_tags WHERE email_id=?", [id], function(err, tagRes) {
          let tags = []
          for (var i=0; i<tagRes.length; i++) {
            tags.push(tagRes[i].tag_id)
          }

          fs.readFile("email_store/" + email.id + ".sme", "binary", function(err, buf) {
            if (err) {
              return cb(new Error("Failed to retreive email"));
            }

            let data = crypto.base64(buf);

            cb(null, email, data, tags);

            database.query("UPDATE emails SET marked_read=1 WHERE id=?", [email.id]);
          });
        });
      }
    });
  } else {
    cb(new Error("Email not found"));
  }
}

exports.create = function(user, subject, from, message) {
  crypto.encrypt(user.keys.public, message, function(err, data, key) {
    database.query("INSERT INTO emails(userid, subject, from_email, date, encrypted_key) VALUES(?, ?, ?, NOW(), ?)", [user.id, subject, from, key], function(err, resp) {
      var id = resp.insertId;
      fs.writeFileSync("email_store/" + user.id + "/" + id + ".sme", data, "binary");
    })
  })
}

exports.generateID = function() {
  return ncrypto.randomBytes(64).toString("hex") + "-incoming@" + config.domain;
}

exports.getTags = function(userid, cb) {
  database.query("SELECT id, tag_name AS tag FROM user_tags WHERE user_id=?", [userid], cb)
}

exports.createTag = function(userid, tag, cb) {
  database.query("SELECT id FROM user_tags WHERE user_id=? AND tag_name LIKE ?", [userid, tag], function(err, tags) {
    if (err) {
      return cb(new Error("Something went wrong"))
    }

    if (tags[0]) {
      return cb(new Error("That tag already exists"))
    }

    database.query("INSERT INTO user_tags(user_id, tag_name) VALUES(?, ?)", [userid, tag], function(err, res) {
      if (err) {
        return cb(new Error("Something went wrong"))
      }

      cb(null, res.insertId);
    })
  })
}

exports.addTag = function(userid, email, tag) {
  database.query("SELECT id FROM emails WHERE id=? AND userid=?", [email, userid], function(err, res) {
    if (res[0]) {
      database.query("INSERT INTO email_tags(email_id, tag_id) VALUES(?, ?)", [email, tag])
    }
  })
}

exports.removeTag = function(userid, email, tag) {
  database.query("SELECT id FROM emails WHERE id=? AND userid=?", [email, userid], function(err, res) {
    if (res[0]) {
      database.query("DELETE FROM email_tags WHERE email_id=? AND tag_id=?", [email, tag])
    }
  })
}

exports.delete = function(userid, id, cb) {
  database.query("SELECT id FROM emails WHERE userid=? AND id=?", [userid, id], function(err, res) {
    if (res[0]) {
      database.query("DELETE FROM email_references WHERE email=? OR reference=?", [id, id], function() {
        database.query("DELETE FROM email_tags WHERE email_id=?", [id], function() {
          database.query("DELETE FROM emails WHERE id=?", [id], function(err) {
            cb(err)
          })
        })
      })
    } else {
      cb(new Error("No such email found"))
    }
  })
}

let sendQueue = [];

exports.addToSendQueue = function(email) {
  sendQueue.push(email)
  if (sendQueue.length == 1) {
    exports.processNextQueueItem()
  }
}

exports.processNextQueueItem = function(){
  if (sendQueue[0]) {
    sendQueue[0].send(function(err) {
      if (err) {
        // generate an undeliverable report thingy
      } else {
        sendQueue.splice(0, 1)
        exports.processNextQueueItem()
      }
    })
  }
}
