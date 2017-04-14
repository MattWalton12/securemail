const net = require("net"),
  tls = require("tls"),
  dns = require("dns"),
  log = require("./../../lib/log.js")

const MessageBuilder = require("./MessageBuilder.js")

class SMTPClient {
  constructor() {
    // accept address to be an array, and loop through until we get a successful connection
    this.connected = false

    this.mode = 1
    this.lastCommand = "none"
    this.supports = []

    this.commandCallback = false

  }

  connect(address, cb) {
    this.initConnection(address, 0, cb)
  }

  parseResponse(data) {
    return {
      code: parseInt(data.substr(0, 3)),
      message: data.substr(3, data.length - 3).trim()
    }
  }

  pipe(data) {
    if (this.mode == 1 && data.toString().trim().length > 2) {
      // we got a command response?
      data = data.toString()

      if (data.split("\r\n").length > 2 && data.substr(3, 1) == "-") {
        // will be them pesky open message things
        data = data.split("\r\n")

        for (var i=0; i<data.length; i++) {
          this.pipe(data[i] + "\r\n")
        }

        return;
      }

      data = this.parseResponse(data)

      if (data.message.substr(0, 1) == "-") {
        if (this.lastCommand == "ehlo") {
          this.supports.push(data.message.substr(1))
        }
      } else {
        if (this.commandCallback) {
          let func = this.commandCallback
          this.commandCallback = false
          func(null, data)
        }
      }
    }
  }

  sendLine(data) {
    this.socket.write(data + "\r\n", "ascii")
  }

  cmd(command, params, cb) {
    if (this.commandCallback) {
      return cb(new Error("Please wait for previous command to finish!"))
    }

    this.sendLine(command.toUpperCase() + " " + params)
    this.commandCallback = cb
    this.lastCommand = command.toLowerCase()
  }

  disconnected() {

  }

  pipeData(data, cb) {
    this.mode = 2

    let lines = data.split("\r\n")

    for (var i=0; i<lines.length; i++) {
      this.sendLine(lines[i])
    }

    this.socket.write("\r\n.\r\n", () => {
      this.mode = 1
      this.commandCallback = cb
    })
  }

  initConnection(addresses, index, cb) {
    let address = addresses

    if (typeof(addresses) == "object") {
      address = addresses[index]
    }

    let timeout = setTimeout(() => {
      sock.end()
      log.debug("failed to connect to server @ " + address + ":25")

      if (typeof(addresses) == "object" && index < addresses.length - 1) {
        this.initConnection(addresses, index + 1, cb)

      } else {
        cb(new Error("Failed to connect to remote server"))
      }

    }, 10000)

    const sock = net.connect({host: address, port: 25, timeout: 5000}, address, () => {
      log.debug("connected to smtp server @ " + address + ":25")
      this.socket = sock
      this.connected = true
      this.mode = 1

      this.commandCallback = (err, data) => {
        if (data.code == 220) {
          this.connected = true
          log.debug("Received welcome message")
          cb()

        } else {
          this.socket.end()
          log.debug("Didn't get a warm welcome from SMTP server :'('")

          cb(new Error("SMTP server didn't like us"))
        }
      }


      clearTimeout(timeout)
    });


    sock.on("error", (err) => {

    })

    sock.on("data", (data) => {
      this.pipe(data)
    })

    sock.on("end", this.disconnected)
  }

  static resolveMX(domain, cb) {
    dns.resolveMx(domain, (err, addresses) => {
      if (err)
        return cb(err)

      addresses = addresses.sort(function(a, b) {
        return a.priority - b.priority
      })

      let records = []

      for (var i=0; i<addresses.length; i++) {
        records.push(addresses[i].exchange)
      }

      cb(null, records)
    })
  }
}

module.exports = SMTPClient
