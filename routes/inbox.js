const email = require("./../lib/email.js"),
  crypto = require("./../lib/crypto.js");

exports.render = function(req, res) {
  res.render("inbox");
}

exports.list = function(req, res) {
  let start = parseInt(req.query.start),
    amount = parseInt(req.query.amount);

  console.log(start, amount)

  if (start != undefined && start >= 0 && amount && amount > 0 && amount < 100) {
    email.list(req.user, start, amount, function(err, emails) {
      res.json({
        status: "success",
        emails: emails
      })
    });
  } else {
    res.json({
      status: "error",
      error: "invalid params"
    });
  }
}

exports.retrieve = function(req, res) {
  let id = parseInt(req.query.id);

  if (id) {
    email.retrieve(req.user, id, function(err, email, data) {
      if (err) {
        res.json({
          status: "error",
          error: "invalid params"
        })

      } else {
        res.json({
          status: "success",
          email: email,
          data: data
        })
      }
    })
  } else {
    res.json({
      status: "error",
      error: "invalid params"
    })
  }
}

exports.getKeys = function(req, res) {
  let user = req.user;

  res.json({
    status: "success",
    publicKey: user.keys.public_pem,
    privateKey: user.keys.private
  });
}
