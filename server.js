//https://color.adobe.com/create/color-wheel/?base=2&rule=Monochromatic&selected=0&name=My%20Color%20Theme&mode=rgb&rgbvalues=0.08630997803355228,0.2846139530123376,0.5,0.4726199560671045,0.7254217000861123,1,0.17261995606710456,0.5692279060246752,1,0.23630997803355225,0.36271085004305614,0.5,0.13809596485368367,0.45538232481974017,0.8&swatchOrder=0,1,2,3,4

const log = require("./lib/log.js"),
  database = require("./lib/database.js"),
  express = require("express"),
  crypto = require("./lib/crypto.js"),
  session = require("express-session"),
  bodyParser = require("body-parser");

log.info("starting email server")

database.connect();

const User = require("./lib/user.js");
let app = express();

app.use(session({
  secret: "ollieisgay",
  cookie: {secure: true}
}));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


app.use(function(req, res, next) {
  if (req.session.user) {
    req.locals.user = new User();
    req.locals.user.load(req.session.user, function() {
      next();
    })
  } else {
    next();
  }
})

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/login/challenge", function(req, res) {
  let username = (req.query.username || "").toString();
  if (username) {
    let user = new User();

    user.generateLoginChallenge(username, function(err, token, challenge) {
      var resp = {};

      if (challenge) {
        resp = {
          status: "success",
          challenge: challenge,
          key: user.keys.private,
          user: user.id
        }

      } else {

        resp = {
          status: "error",
          error: "Incorrect username or password"
        }
      }

      res.json(resp);
    });
  }
});

app.post("/login/response", function(req, res) {
  if (req.body.user) {
    let user = new User()

    user.load(parseInt(req.body.user), (err, done) => {
      if (err || !done) {
        req.flash("Invalid username or password");
        return res.redirect("/login");
      }

      user.doLogin(req.body.token, (err) => {
        let resp = {}
        if (err) {
          req.flash("Invalid username or password")
          res.redirect("/login");

        } else {
          req.session.user = user.id;
          req.session.authenticated = true;

          res.redirect("/inbox");
        }
      })
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/inbox", function(req, res) {
  res.render("inbox");
});

app.use("/static", express.static("static"));

app.listen(8080);
