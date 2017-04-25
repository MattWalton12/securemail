const email = require("./../lib/email.js"),
  crypto = require("./../lib/crypto.js"),
  spam = require("./../lib/spam.js"),
  config = require("./../config.json")

const Email = require("./../class/Email.js")

exports.render = function(req, res) {
  res.render("inbox");
}

exports.list = function(req, res) {
  let start = parseInt(req.query.start),
    amount = parseInt(req.query.amount),
    type = parseInt(req.query.type) || 1,
    search = req.query.search


  if (start != undefined && start >= 0 && amount && amount > 0 && amount < 100) {
    email.list(req.user, start, amount, search, type, function(err, emails, count) {
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
    email.retrieve(req.user, id, function(err, email, data, tags) {
      if (err) {
        res.json({
          status: "error",
          error: "invalid params"
        })

      } else {
        res.json({
          status: "success",
          email: email,
          data: data,
          tags: tags
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

    newEmail.build(function() {
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

exports.getTags = function(req, res) {
  email.getTags(req.user.id, function(err, tags) {
    if (err) {
      res.json({
        status: "error",
        error: err.message
      })
    } else {
      res.json({
        status: "success",
        tags: tags
      })
    }
  })
}

exports.createTag = function(req, res) {
  let tag = (req.body.tag || "").toString()

  if (tag.length > 2) {
    email.createTag(req.user.id, tag, function(err, id) {
      if (err) {
        res.json({
          status: "error",
          error: err.message
        })
      } else {
        res.json({
          status: "success",
          id: id
        })
      }
    })
  } else {
    res.json({
      status: "error",
      error: "Please enter a valid tag name"
    })
  }
}

exports.addTag = function(req, res) {
  let id = req.body.email
  let tag = req.body.tag

  if (id && tag) {
    email.addTag(req.user.id, id, tag)
    res.json({
      status: "success"
    })
  } else {
    res.json({
      status: "error",
      error: "invalid params"
    })
  }
}

exports.removeTag = function(req, res) {
  let id = req.body.email
  let tag = req.body.tag

  if (id && tag) {
    email.removeTag(req.user.id, id, tag)
    res.json({
      status: "success"
    })
  } else {
    res.json({
      status: "error",
      error: "invalid params"
    })
  }
}

exports.delete = function(req, res) {
  let id = req.body.id

  if (id) {
    email.delete(req.user.id, id, function(err) {
      if (err) {
        res.json({
          status: "error",
          error: err.message
        })
      } else {
        res.json({
          status: "success"
        })
      }
    });
  } else {
    res.json({
      status: "error",
      error: "Please enter an ID to delete"
    })
  }
}

exports.markSpam = function(req, res) {
  let id = req.body.id

  if (id) {
    spam.mark(req.user.id, id, function(err) {
      if (err) {
        res.json({
          status: "error",
          error: err.message
        })
      } else {
        res.json({
          status: "success"
        })
      }
    })

  } else {
    res.json({
      status: "error",
      error: "Please enter an ID to mark"
    })
  }
}
