//https://color.adobe.com/create/color-wheel/?base=2&rule=Monochromatic&selected=0&name=My%20Color%20Theme&mode=rgb&rgbvalues=0.08630997803355228,0.2846139530123376,0.5,0.4726199560671045,0.7254217000861123,1,0.17261995606710456,0.5692279060246752,1,0.23630997803355225,0.36271085004305614,0.5,0.13809596485368367,0.45538232481974017,0.8&swatchOrder=0,1,2,3,4

const log = require("./lib/log.js"),
  database = require("./lib/database.js"),
  email = require("./lib/email.js"),
  express = require("express"),
  session = require("express-session"),
  middleware = require("./lib/middleware.js"),
  fs = require("fs"),
  bodyParser = require("body-parser");

const routes = require("./routes");

log.info("starting email server")

database.connect();

const User = require("./lib/user.js");
let app = express();

app.use(session({
  secret: "ollieisgay",
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

app.get("/login", routes.auth.renderLogin);
app.get("/register", routes.auth.renderRegister);
app.post("/register", routes.auth.register);
app.get("/login/challenge", routes.auth.challenge);
app.post("/login/response", routes.auth.response);
app.get("/inbox", middleware.authed, routes.inbox.render);
app.get("/inbox/list", middleware.authed, routes.inbox.list);
app.get("/inbox/retrieve", middleware.authed, routes.inbox.retrieve);
app.get("/inbox/getKeys", middleware.authed, routes.inbox.getKeys);


app.listen(8080);

const SMTPServer = require("./class/smtp/server.js");

var server = new SMTPServer(2500);
