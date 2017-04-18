// RFC5322 MIME Parser

const util = require("./../../lib/util.js");

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

  split(data, cb) {
    let splitData = this.originalMessage.split("\r\n")
    let body = ""
    let headers = ""

    if (splitData.indexOf("") != -1) {
      body = splitData.splice(splitData.indexOf("") + 1).join("\r\n")
      splitData.pop()
      headers = splitData.join("\r\n")
    }

    cb(null, headers, body)
  }

  parse(headerOnly) {

    this.split(this.originalMessage, (err, headers, body) => {
      this.parseHeaders(headers)
      if (!headerOnly)
        this.parseBody(body)
    })
  }

  parseHeaders(data) {
    data = unfoldData(data)
    data = uncommentData(data)

    let headerList = data.split("\r\n")

    for (var i=0; i<headerList.length; i++) {
      let splitHeader = headerList[i].split(":")
      if (splitHeader.length > 1) {
        let splitHeaderName = splitHeader[0].trim().toLowerCase()
        splitHeader.splice(0, 1)
        let splitHeaderBody = splitHeader.join(":").trim()
        this.headers[splitHeaderName] = splitHeaderBody
      }
    }
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

function unfoldData(data) {
  let unfoldedData = "";

  let add = true;

  for (var i=0; i<data.length; i++) {
    if (i >= 1 && data.length > i+2 && data.charCodeAt(i) == Codes.CR && data.charCodeAt(i+1) == Codes.LF && (data.charCodeAt(i+2) == Codes.SPACE || data.charCodeAt(i+2) == Codes.TAB)) {
      unfoldedData = unfoldedData.trim()
      add = false;

      continue
    }

    if (!add && data.charCodeAt(i) != Codes.LF) {
      add = true;
    }

    if (add) {
      unfoldedData += data[i]
    }
  }

  return unfoldedData;
}

function uncommentData(data) {
  let uncommented = ""

  let commentDepth = 0

  for (var i=0; i<data.length; i++) {
    if (data[i] == "(") {
      commentDepth++;
      continue;

    } else if (data[i] == ")") {
      commentDepth--;
      continue;
    }

    if (commentDepth < 1) {
      uncommented += data[i]
    }
  }

  return uncommented
}

module.exports = MessageParser
