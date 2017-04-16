const email = require("./../lib/email.js"),
  crypto = require("./../lib/crypto.js"),
  config = require("./../config.json")

const Email = require("./../class/Email.js")

exports.render = function(req, res) {
  res.render("inbox");
}

exports.list = function(req, res) {
  let start = parseInt(req.query.start),
    amount = parseInt(req.query.amount),
    type = parseInt(req.query.type) || 1;

  console.log(start, amount, type)

  if (start != undefined && start >= 0 && amount && amount > 0 && amount < 100) {
    email.list(req.user, start, amount, type, function(err, emails, count) {
      res.json({
        status: "success",
        emails: emails,
        unread: count
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

exports.send = function(req, res) {
  let to = (req.body.to || "").toString()
  let subject = (req.body.subject || "No subject").toString()
  let body = (req.body.body || "").toString()


  if (to && body) {
    let recipients = to.split(",")


    let newEmail = new Email()
    newEmail.setSubject(subject)

    for (var i=0; i<recipients.length; i++) {
      newEmail.addRecipient(recipients[i])
    }

    newEmail.setSender(req.user.username + "@" + config.domain)
    newEmail.setBody(body)
    newEmail.setUser(req.user)

    console.log("Test")
    newEmail.build(function() {
      console.log("test2")
      newEmail.save(function() {
        newEmail.queue()

        res.json({
          status: "success"
        })
      })
    });

  } else {
    res.json({
      status: "error",
      error: "Invalid recipients or body"
    })
  }
}
