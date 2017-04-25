const User = require("./../class/User.js");

exports.renderLogin = function(req, res) {
  if (req.session.authenticated) {
    res.redirect("/inbox");
  } else {
    res.render("login");
  }
}

exports.renderRegister = function(req, res) {
  if (req.session.authenticated) {
    res.redirect("/inbox");
  } else {
    res.render("register");
  }
}

exports.challenge = function(req, res) {
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
}

exports.response = function(req, res) {
  if (req.body.user) {
    let user = new User()

    user.load(parseInt(req.body.user), (err, done) => {
      if (err || !done) {
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
}

exports.register = function(req, res) {
  let username = req.body.username,
    publicKey = req.body.publicKey,
    privateKey = req.body.privateKey;

  var user = new User();
  user.create(username, publicKey, privateKey, function(err, id) {
    var resp = {};

    if (err) {
      resp.status = "error";
      resp.error = err.message;

    } else {
      resp.status = "success";
      req.session.user = id;
      req.session.authenticated = true;
    }

    res.json(resp);
  })
}

exports.logout = function(req, res) {
  req.session.destroy()
  res.redirect("/login")
}
