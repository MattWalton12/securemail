class MessageBuilder {
  constructor() {
    this.headers = []
    this.body = ""

    this.addHeader("MIME-Version", "1.0")
    this.addHeader("Content-Type", "text/plain; charset=UTF-8")

  }

  addHeader(header, value) {
    this.headers.push({name: header, value: value})
  }

  setBody(body) {
    this.body = body;
  }

  build(cb) {

    this.addHeader("Date", (new Date()).toUTCString())

    let output = ""

    for (var i=0; i<this.headers.length; i++) {
      let line = this.headers[i].name + ": " + this.headers[i].value

      // folding the lines
      var first = true

      while (line.length > 0) {
        if (!first) {
          output += "\t"
        }
        output += line.substr(0, 78) + "\r\n"
        line = line.substr(78)
        first = false
      }


    }

    output += "\r\n"
    output += this.body

    cb(null, output)
  }
}

module.exports = MessageBuilder
