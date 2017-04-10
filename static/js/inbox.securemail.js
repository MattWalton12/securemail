sm.inbox = {}
sm.inbox.index = 0;

sm.inbox.keys = {};


sm.inbox.init = function(cb) {

  var password = sessionStorage.getItem("sm_password");
  if (!password) {
    return sm.inbox.prompt(function() {
      sm.inbox.init(cb);
    })
  }

  $(".content-loader").fadeIn();

  $.getJSON("/inbox/getKeys", function(data) {
    sm.crypto.importKeys(data.publicKey, data.privateKey, password, function(err, publicKey, privateKey) {
      if (err) {
        return sm.inbox.prompt(function() {
          sm.inbox.init(cb);
        })
      } else {
        sm.inbox.keys.public = publicKey;
        sm.inbox.keys.private = privateKey;
        cb();
      }
    });
  });
}

sm.inbox.load = function(cb) {
  var loadAmount = Math.ceil((window.innerHeight / 57) * 1.7)
  $.getJSON("/inbox/list?start=" + sm.inbox.index + "&amount=" + loadAmount, function(data) {
    cb(null, data.emails)
  });
}

sm.inbox.retrieve = function(id, cb) {
  $.getJSON("/inbox/retrieve?id=" + id, function(data) {
    if (data.status == "success") {
      var dd = forge.util.decode64(data.data);
      sm.crypto.decrypt(sm.inbox.keys.private, data.data, data.email.encrypted_key, function(err, message) {
        cb(err, data.email, message);
      });
    } else {
      alert("Failed to load email");
    }
  });
}

sm.inbox.updateView = function(email, message) {
  email.date = new Date(email.date * 1000);

  $("#email-view-subject").html(email.subject);
  $("#email-view-from").html(email.from_email);
  $("#email-view-date").html(sm.inbox.formatDate(email.date));
  $("#email-view-content").html(message);
}

sm.inbox.openView = function() {
  $(".email-view-container").css("padding-left", "0px");
}

sm.inbox.closeView = function() {
  $(".email-view-container").css("padding-left", "550px");
}

sm.inbox.extendView = function() {
  $(".email-view-container").addClass("extended");
  $(".list-overlay").fadeIn();
}

sm.inbox.shrinkView = function() {
  $(".list-overlay").fadeOut();
  $(".email-view-container").removeClass("extended");
}

sm.inbox.prompt = function(cb) {
  $(".main").hide();
  $(".content-loader").hide();

  $(".password-prompt-container").fadeIn();
  sm.inbox.promptFunction = cb;
}

sm.inbox.promptSubmit = function(password) {
  $(".password-prompt-container").fadeOut(function() {
    sessionStorage.setItem("sm_password", password);
    if (sm.inbox.promptFunction) {
      sm.inbox.promptFunction(password);
    }
  })
}

sm.inbox.formatDate = function(date) {
  if (date.toLocaleDateString() == (new Date()).toLocaleDateString()) {
    // check if the date is the same, if so only display hours
    return ("0" + date.getHours()).substr(-2) + ":" + ("0" + date.getMinutes()).substr(-2);
  } else {
    return ("0" + date.getDate()).substr(-2) + "/" + ("0" + date.getMonth()).substr(-2) + "/" + date.getFullYear();
  }
}
