const net = require("net"),
  tls = require("tls"),
  fs = require("fs"),
  log = require("./../../lib/log.js"),
  SMTPConnection = require("./Connection.js");

class SMTPServer {
  handler(socket) {
    let connection = new SMTPConnection(socket, this._server);
  }

  constructor(port) {

    let secureContext = new Map();
    secureContext.set("default", {
      key: fs.readFileSync("securemail.pem").toString(),
      cert: fs.readFileSync("securemail-cert.pem").toString(),
      honorCipherOrder: true,
      requestOCSP: true
    });


    this._server = net.createServer({
      secureContext: secureContext
    }, (socket) => {
      this.handler(socket)
    }).listen(port);

    this._server.sharedCreds = secureContext.get("default");
    this._server.secureContext = secureContext;

    log.info("Creating SMTP server on port " + port)


  }
}

module.exports = SMTPServer;
