// RFC5322 MIME Parser

const util = require("./../lib/util.js"),
      mime = require("./../lib/mime.js")

const Codes = {
  CR: 13,
  LF: 10,
  TAB: 9,
  SPACE: 32
}

class MessageParser {
  constructor() {
    this.originalMessage = ""
    this.headers = {}
    this.body = ""
  }

  pipe(data) {

    this.originalMessage += data

    if (this.originalMessage.substr(this.originalMessage.length - 5) == "\r\n.\r\n") {
      this.originalMessage = this.originalMessage.substr(0, this.originalMessage.length - 5)
      return false
    } else {
      return true
    }
  }

  parse(headerOnly) {
    mime.split(this.originalMessage, (err, headers, body) => {
      this.parseHeaders(headers)
      if (!headerOnly)
        this.parseBody(body)
    })
  }

  parseHeaders(data) {
    data = mime.unfold(data)
    data = mime.uncomment(data)
    this.headers = mime.processHeaders(data)
  }

  parseBody(data) {
    this.body = data.replace("\r\n.\r\n", "")
  }

  extractMeta(cb) {
    let meta = {}

    this.parse(true)

    if (this.headers["from"] && this.headers["date"]) {

      meta.in_reply_to = ""
      meta.from = util.processAddress(this.headers["from"])

      if (this.headers["message-id"])
        meta.message_id = this.headers["message-id"]

      if (this.headers["content-type"]) {
        meta.content_type = this.headers["content-type"]
      } else {
        meta.content_type = "text"
      }

      if (this.headers["to"]) {
        meta.to = util.processAddressString(this.headers["to"])
      }

      if (this.headers["subject"])
        meta.subject = this.headers["subject"]

      if (this.headers["references"])
        meta.references = this.headers["references"].split(" ")

      if (this.headers["in-reply-to"])
        meta.in_reply_to = this.headers["in-reply-to"]

      cb(null, meta);


    } else {
      cb(new Error("Invalid email headers"))
    }
  }

}

module.exports = MessageParser
