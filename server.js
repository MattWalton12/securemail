//https://color.adobe.com/create/color-wheel/?base=2&rule=Monochromatic&selected=0&name=My%20Color%20Theme&mode=rgb&rgbvalues=0.08630997803355228,0.2846139530123376,0.5,0.4726199560671045,0.7254217000861123,1,0.17261995606710456,0.5692279060246752,1,0.23630997803355225,0.36271085004305614,0.5,0.13809596485368367,0.45538232481974017,0.8&swatchOrder=0,1,2,3,4

const log = require("./lib/log.js"),
  database = require("./lib/database.js"),
  email = require("./lib/email.js"),
  express = require("express"),
  session = require("express-session"),
  middleware = require("./lib/middleware.js"),
  config = require("./config.json"),
  fs = require("fs"),
  spam = require("./lib/spam.js"),
  bodyParser = require("body-parser");

const routes = require("./routes");

log.info("Starting SecureMail email server")

database.connect(function() {
  spam.load()
})

const User = require("./class/User.js");
let app = express();

app.use(session({
  secret: "verysecuresessionsecret",
  cookie: {secure: false}
}));

app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use("/static", express.static("static"));
app.use(function(req, res, next) {
  if (req.session.user) {
    req.user = new User();
    req.user.load(req.session.user, function() {
      next();
    })
  } else {
    next();
  }
});

app.get("/", function(req, res) {
  res.redirect("/inbox")
})

app.get("/login", routes.auth.renderLogin)
app.get("/logout", middleware.authed, routes.auth.logout)
app.get("/register", routes.auth.renderRegister)
app.post("/register", routes.auth.register)
app.get("/login/challenge", routes.auth.challenge)
app.post("/login/response", routes.auth.response)
app.get("/inbox", middleware.authed, routes.inbox.render)
app.get("/inbox/list", middleware.authed, routes.inbox.list)
app.get("/inbox/retrieve", middleware.authed, routes.inbox.retrieve)
app.get("/inbox/getKeys", middleware.authed, routes.inbox.getKeys)
app.post("/inbox/send", middleware.authed, routes.inbox.send)
app.post("/inbox/createTag", middleware.authed, routes.inbox.createTag)
app.get("/inbox/getTags", middleware.authed, routes.inbox.getTags)
app.post("/inbox/delete", middleware.authed, routes.inbox.delete)
app.post("/inbox/markSpam", middleware.authed, routes.inbox.markSpam)
app.post("/inbox/addEmailTag", middleware.authed, routes.inbox.addTag)
app.post("/inbox/removeEmailTag", middleware.authed, routes.inbox.removeTag)

app.listen(8080);

const SMTPServer = require("./class/SMTPServer.js");

var server = new SMTPServer(config.port);
