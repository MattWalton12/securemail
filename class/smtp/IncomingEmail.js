const User = require("./../../lib/user.js"),
  log = require("./../../lib/log.js"),
  util = require("./../../lib/util.js"),
  config = require("./../../config.json"),
  MessageParser = require("./MessageParser.js"),
  Email = require("./../Email.js")


let idCounter = 0;

class IncomingEmail extends Email {
  constructor() {
    super()
    this.parser = new MessageParser()
    this.type = 1

  }

  addRecipient(recipient, cb) {

    recipient = util.processAddress(recipient)
    let address = recipient.address.split("@")

    let username = address[0]
    let domain = address[1];

    if (domain == config.domain) {
      let user = new User()
      user.load(username, (err, exists) => {
        if (exists) {
          this.recipients.push(user);
          cb()

        } else {
          cb(new Error("user not found"));
        }
      })
    } else {
      cb(new Error("user not found"));
    }
  }

  process() {
    this.parser.extractMeta((err, meta) =>{
      if (!err) {
        this.meta = meta
        this.data = this.parser.originalMessage

        this.setSender(this.meta.from)

        for (var i=0; i<this.recipients.length; i++) {
          let indEmail = new IncomingEmail()
          Object.assign(indEmail, this)
          indEmail.user = this.recipients[i]
          indEmail.save(function(err, id) {
            log.debug("should've saved?? " + id)
          });
        }

      } else {
        log.debug("ERROR" + err.toString())
      }
    })
  }
}

module.exports = IncomingEmail
