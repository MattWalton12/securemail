const User = require("./../../lib/user.js")

class SMTPEmail = {
  constructor() {
    this.sender = {}
    this.recipients = [];
  }

  setSender(sender) {
    let senderEmail = sender.stripBrackets();
    this.sender.email = senderEmail;
  }

  addRecipients(recipient, cb) {
    recipient = recipient.stripBrackets().split("@")
    let username, domain = recipient[0], recipient[1];

    if (domain == "securemail.com") {
      User.exists(username, function(err, exists) {
        if (exists) {
          this.recipients.push(username);
        } else {
          cb(new Error("user not found"));
        }
      })
    } else {
      cb(new Error("user not found"));
    }
  }
}

String.prototype.stripBrackets = function() {
  return this.toLowerCase().replace(">", "").replace(">", "").trim()
}
