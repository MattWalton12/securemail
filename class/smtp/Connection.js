const tls = require("tls"),
  fs = require("fs");

const AcceptedCommands = [
  "EHLO",
  "HELO",
  "STARTTLS"
]

class SMTPConnection {

  constructor(socket, server) {
    this._socket = socket;
    this._server = server;

    this.status = 1;

    socket.on("data", (data) => {
      this.dataHandler(data)
    });

    this.welcome();
  }

  response(code, data) {
    this._socket.write(code.toString() + " " + data + "\r\n")
    console.log(code.toString() + " " + data + "\r\n")
  }

  write(data) {
    this._socket.write(data);
  }

  writeLine(data) {
    this._socket.write(data + "\r\n");
  }

  dataHandler(data) {
    console.log("got data")
    console.log(data.toString());

    if (this.status == 1) {
      this.command(data.toString());
    }
  }

  command(data) {

    let commandData = data.split(" ")
    let cmd = commandData[0].trim().toUpperCase();

    console.log("new cmd", cmd)

    if (AcceptedCommands.indexOf(cmd) != -1) {
      console.log("done")
      commandData.splice(0, 1);
      this["cmd_" + cmd](commandData);
    }
  }

  cmd_EHLO(params) {
    if (params.length > 0) {
      this.writeLine("250-SIZE 100000");
      this.writeLine("250-STARTTLS");
      this.writeLine("250-HELP");
      this.response(250, "smtp.securemail.com ready");
    }
  }

  cmd_STARTTLS(params) {
    console.log("upgrading to tls");
    this.response(220, "ready to start TLS");

    let secureContext = this._server.secureContext.get("default");
    let tlsSocket = new tls.TLSSocket(this._socket, {
      cert: secureContext.cert,
      key: secureContext.key,
      isServer: true,
      server: this._server.server,

      SNICallback: function(servername, cb) {
        console.log(servername, "SNI")
      }
    })

    this._socket.removeAllListeners();

    tlsSocket.on("secureConnection", () => {
      this.secure = true;
      console.log("upgraded to secure connection bby!!")

      tlsSocket.on("data", (data) => {
        this.dataHandler(data);
      });

      this._socket = tlsSocket;
    })
  }

  welcome() {
    this.response(220, "smtp.securemail.com ESMTP securemail v1.0")
  }
}

module.exports = SMTPConnection

/*

v
*/
