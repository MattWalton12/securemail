const util = require("./../lib/util.js"),
  crypto = require("./../lib/crypto.js"),
  email = require("./../lib/email.js"),
  log = require("./../lib/log.js"),
  database = require("./../lib/database.js"),
  config = require("./../config.json"),
  fs = require("fs")

const MessageBuilder = require("./smtp/MessageBuilder.js"),
  SMTPClient = require("./smtp/Client.js")

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

  setSender(obj) {
    if (typeof obj != "object")
      obj = {address: obj}

    if (!obj.name || obj.name.trim() == "") {
      obj.name = obj.address
    }

    this.sender = obj

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
        database.query("INSERT INTO emails(userid, subject, email, name, date, encrypted_key, type) VALUES(?, ?, ?, ?, NOW(), ?, ?)",
          [this.user.id, this.meta.subject, (this.type == 2 && this.recipients.join(";") || this.sender.address), (this.type == 2 && "" || this.sender.name), key, this.type],

          function(err, resp) {
            if (err)
              return cb(err);

            var id = resp.insertId;
            fs.writeFileSync("email_store/" + id + ".sme", data, "binary");

            this.id = id
            cb(null, id);
          }
        )
      })
    }
  }

  queue() {
    email.addToSendQueue(this);
  }

  build(cb) {
    let message = new MessageBuilder()
    message.addHeader("From", this.sender.name + "<" + this.sender.address + ">")
    message.addHeader("Subject", this.meta.subject)

    let recipients = [];
    let recipientDomains = []

    for (var i=0; i<this.recipients.length; i++) {
      recipients.push("<" + this.recipients[i] + ">")
      recipientDomains.push(this.recipients[i].split("@")[1].toLowerCase())
    }

    message.addHeader("To", recipients.join(", "))
    message.setBody(this.body)

    message.build((err, data) => {
      this.data = data
      cb()
    })
  }

  send(cb) {


    let index = 0;
    let errors = []

    let recipients = [];
    let recipientDomains = []

    for (var i=0; i<this.recipients.length; i++) {
      recipients.push("<" + this.recipients[i] + ">")
      recipientDomains.push(this.recipients[i].split("@")[1].toLowerCase())
    }

    let doSend = () => {
      if (recipientDomains[index]) {
        let domainRecipients = []

        for (var i=0; i<this.recipients.length; i++) {
          if (this.recipients[i].split("@")[1].toLowerCase() == recipientDomains[index]) {
            domainRecipients.push(this.recipients[i])
          }
        }

        SMTPClient.resolveMX(recipientDomains[index], (err, servers) => {
          if (err) {
            return errors.push(err)
          }

          let client = new SMTPClient()
          client.connect(servers, (err) => {
            if (err) {
              return errors.push(err)
            }

            client.cmd("ehlo", config.domain, (err, resp) => {
              if (err)
                return errors.push(err)

              if (resp.code == 250) {
                client.cmd("mail", "FROM:<" + this.sender.address + ">", (err, resp) => {
                  if (resp.code == 250) {

                    let rIndex = 0
                    let successful = 0

                    let addRecipient = (rcb) => {
                      if (domainRecipients[rIndex]) {
                        client.cmd("rcpt", "to:<" + domainRecipients[rIndex] + ">", (err, resp) => {
                          if (resp.code != 250) {
                            errors.push(new Error("Undeliverable to " + domainRecipients[rIndex] + " : " + resp.message))
                          } else {
                            successful++
                          }

                          rIndex ++
                          addRecipient(rcb)

                        })
                      } else {
                        rcb()
                      }
                    }

                    addRecipient(() => {
                      if (successful > 0) {
                        client.cmd("data", "", (err, resp) => {
                          if (err)
                            return errors.push(err)

                          if (resp.code == 354) {
                            client.pipeData(this.data, (err, resp) => {
                              if (err)
                                return errors.push(err)

                              if (resp.code == 250) {
                                log.debug("Successfully sent message #" + (this.id || "UNKNOWN"))
                                index++
                                doSend()
                              } else {
                                return errors.push(new Error(resp.code + " " + resp.message))
                              }
                            })
                          } else {
                            errors.push(new Error(resp.code + " " + resp.message))
                          }
                        })
                      } else {
                        client.quit()
                      }
                    })


                  } else {
                    this.handleSendError(resp, cb)
                  }
                })

              } else {
                this.handleSendError(resp, cb)
              }
            })
          })
        })
      } else {
        cb(errors);
      }
    }

    doSend()

  }
}

let newEmail = new Email()


module.exports = Email
