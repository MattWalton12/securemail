sm.users = {}

var User = function() {

}

User.prototype.setKeys = function(pub, priv) {
  this.keys = {}
  this.keys.pub = pub;
  this.keys.priv = priv;
}

User.prototype.setPassword = function(password) {
  this.password = password;
}

User.prototype.setUsername = function(username) {
  this.username = username;
}

var specialCharacters = "`~§±!@£$%^&*()-=_+[]{}:;\"'|\\<>,./?";

sm.users.register = function(username, password, cb) {
  // validation on the username, make sure there are no special characters
  var goodUsername = true;

  for (var i=0; i<username.length; i++) {
    var charCode = username.charCodeAt(i);
    if (charCode < 48 || (charCode > 57 && charCode < 65) || (charCode > 90 && charCode < 97) || charCode > 122) {
      goodUsername = false;
      break;
    }
  }

  if (!goodUsername) {
    return cb(new Error("Your username contains invalid characters m8"));
  }

  if (password.length < 8) {
    return cb(new Error("Please make your password longer m8"));
  }

  var goodPassword = false;

  for (var i=0; i<specialCharacters.length; i++) {
    if (password.indexOf(specialCharacters[i]) > -1) {
      goodPassword = true;
      break;
    }
  }

  if (!goodPassword) {
    return cb(new Error("cmon m8, put some special characters in there"))
  }

  var newUser = new User();
  newUser.setUsername(username);
  newUser.setPassword(password);

  sm.crypto.generateKeypair(function(err, publicKey, privateKey) {
    newUser.setKeys(publicKey, privateKey);

    sm.crypto.exportKeys(publicKey, privateKey, password, function(err, publicKey, encryptedPrivate) {
      var postData = {
        username: newUser.username,
        publicKey: publicKey,
        privateKey: encryptedPrivate
      }

      $.ajax("/register", {
        data: JSON.stringify(postData),
        contentType: "application/json",
        type: "POST",
        success: function(data) {
          if (data.status == "success") {
            cb();
          } else {
            cb(new Error(data.error));
          }
        }
      });
    });
  });
}
