exports.authed = function(req, res, next) {
  if (req.session.authenticated && req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}
