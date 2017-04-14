const database = require("./database.js"),
  crypto = require("./crypto.js"),
  fs = require("fs");

exports.list = function(user, start, amount, cb) {
  database.query("SELECT id, subject, email, name, UNIX_TIMESTAMP(date) AS date, marked_read FROM emails WHERE userid=? ORDER BY date DESC LIMIT ?, ?", [user.id, start, start+amount], function(err, emails) {
    cb(null, emails);
  });
}

exports.retrieve = function(user, id, cb) {
  id = parseInt(id);

  if (id) {
    database.query("SELECT id, subject, email, UNIX_TIMESTAMP(date) AS date, encrypted_key FROM emails WHERE userid=? AND id=?", [user.id, id], function(err, email) {
      if (email && email[0]) {
        email = email[0];
        fs.readFile("email_store/" + email.id + ".sme", "binary", function(err, buf) {
          if (err) {
            return cb(new Error("Failed to retreive email"));
          }

          let data = crypto.base64(buf);

          cb(null, email, data);

          database.query("UPDATE emails SET marked_read=1 WHERE id=?", [email.id]);
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
