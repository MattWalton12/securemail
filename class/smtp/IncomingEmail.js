const User = require("./../../lib/user.js"),
  log = require("./../../lib/log.js"),
  util = require("./../../lib/util.js"),
  config = require("./../../config.json"),
  MessageParser = require("./MessageParser.js")


let idCounter = 0;

class IncomingEmail extends Email {
  constructor() {
    idCounter++;

    this.internalID = idCounter;
    this.sender = ""
    this.recipients = [];
    this.parser = new MessageParser()

    log.debug("Initialising new email #" + this.internalID)
  }

  setSender(sender) {
    let address = util.processAddress(sender)
    this.sender = address.address

    log.debug("Set sender to " + this.sender + " for #" + this.internalID)
  }

  addRecipient(recipient, cb) {

    recipient = util.processAddress(recipient)
    let address = recipient.address.split("@")

    let username = address[0]
    let domain = address[1];

    if (domain == config.domain) {
      User.exists(username, (err, exists) => {
        if (exists) {
          log.debug("Added recipient " + username + " for #" + this.internalID)
          this.recipients.push(username);
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
    this.parser.extractMeta(function(err, meta) {
      if (!err) {

      }
    })
  }
}

String.prototype.stripBrackets = function() {
  return this.toLowerCase().replace(">", "").replace(">", "").trim()
}

module.exports = SMTPEmail
