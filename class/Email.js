const util = require("./../lib/util.js"),
  crypto = require("./../lib/crypto.js"),
  database = require("./../lib/database.js"),
  fs = require("fs")

class Email {
  constructor() {
    this.meta = {}
    this.recipients = []
    this.type = 2
  }

  setSubject(subject) {
    this.meta.subject = subject
  }

  addRecipient(email) {
    if (util.validEmail(email)) {
      this.recipients.push(email)
      return true
    } else {
      return false
    }
  }

  setSender(email) {
    this.sender = email
  }

  setBody(body) {
    this.body = body
  }

  setContentType(type) {
    this.meta.content_type = type
  }

  setUser(user) {
    this.user = user
  }

  save(cb) {
    if (this.user && this.data) {
      crypto.encrypt(this.user.keys.public, this.data, (err, data, key) => {
        console.log(this.sender)
        database.query("INSERT INTO emails(userid, subject, email, date, encrypted_key, type, content_type) VALUES(?, ?, ?, NOW(), ?, ?, ?)",
          [this.user.id, this.meta.subject, (this.type == 2 && this.recipients.join(";") || this.sender), key, this.type, this.meta.content_type],

          function(err, resp) {
            if (err)
              return cb(err);

            var id = resp.insertId;
            fs.writeFileSync("email_store/" + id + ".sme", data, "binary");
            cb(null, id);
          }
        )
      })
    }
  }
}

module.exports = Email
