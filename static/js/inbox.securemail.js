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

  $(".sm-content-loader").fadeIn();

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

sm.inbox.currentRawMessage = ""

sm.inbox.updateView = function(email, message) {
  email.date = new Date(email.date * 1000);

  $("#email-view-subject").html(sm.mime.parseSubject(email.subject));
  $("#email-view-from").html(email.email);
  $("#email-view-date").html(sm.inbox.formatDate(email.date));

  sm.inbox.currentRawMessage = message

  sm.inbox.getEmailDisplays(message, function(err, displays) {
    if (displays[0]) {
      if (displays[0].type == "text/plain") {
        $("#email-view-content-html").hide()
        var body = displays[0].body.trim()
        body = body.replace(new RegExp("\n", "g"), "<br>")
        $("#email-view-content-text").html(body)
        $("#email-view-content-text").show()
      } else if (displays[0].type == "text/html") {
        $("#email-view-content-text").hide()
        $("#email-view-content-html").contents().find("html").html(displays[0].body)
        $("#email-view-content-html").css("height", $(".sm-email-view").height() - $(".sm-email-header").height() + "px")
        $("#email-view-content-html").show()

        var iframe = $("#email-view-content-html").contents();
        console.log("TEST")
        console.log(iframe.find("a"))
        iframe.find("a").click(function(e) {
          e.preventDefault();
          var link = $(this).attr("href")
          var popup = window.open("about:blank", "_blank")
          popup.location = link
        })

      }
    }
  })

}

sm.inbox.viewRaw = function() {
  var rawWindow = window.open("", "message.txt", "width=1000,height=800")
  rawWindow.document.write("<textarea style='width:100%; height:100%'>" + sm.inbox.currentRawMessage + "</textarea>")
}

sm.inbox.openView = function() {
  $(".sm-email-view-container").css("padding-left", "0px");
}

sm.inbox.closeView = function() {
  $(".sm-email-view-container").css("padding-left", "550px");
}

sm.inbox.extendView = function() {
  $(".sm-email-view-container").addClass("sm-extended");
  $(".sm-list-overlay").fadeIn();
}

sm.inbox.shrinkView = function() {
  $(".sm-list-overlay").fadeOut();
  $(".sm-email-view-container").removeClass("sm-extended");
}

sm.inbox.prompt = function(cb) {
  $(".sm-main").hide();
  $(".sm-content-loader").hide();

  $(".sm-password-prompt-container").fadeIn();
  sm.inbox.promptFunction = cb;
}

sm.inbox.promptSubmit = function(password) {
  $(".sm-password-prompt-container").fadeOut(function() {
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

var preferredTypes = ["text/html", "text/plain"]

sm.inbox.getEmailDisplays = function(data, callback) {
  sm.mime.process(data, function(err, data) {
    var displays = []


    function recursiveSearch(obj, cb) {
      if (obj.children) {
        var i = 0;

        function go() {
          if (obj.children[i]) {
            recursiveSearch(obj.children[i], function() {
              i++;
              go();
            })
          } else {
            cb()
          }
        }

        go()

      } else {
        if (obj.headers["content-disposition"] && obj.headers["content-disposition"] != "inline") {
          return cb()
        }

        if (!obj.body || !obj.headers["content-type"]) {
          return cb();
        }

        var type = obj.headers["content-type"].split(";")[0].trim()

        if (preferredTypes.indexOf(type) == -1) {
          return cb()
        }

        displays.push({
          type: type,
          body: obj.body
        })

        cb()
      }
    }

    recursiveSearch(data, function() {
      displays.sort(function(a, b) {
        if (a.type == preferredTypes[0]) {
          return -1
        } else {
          return 1
        }
      })

      callback(null, displays)
    })
  })
}

sm.inbox.compose = function(to, subject, body) {
  to = to || ""
  subject = subject || ""
  body = body || ""

  $(".sm-send-container #send-to").val(to)
  $(".sm-send-container #send-subject").val(subject)
  $(".sm-send-container #send-body").text(body)
  $(".sm-send-container").removeClass("sm-hidden closed")
}

sm.inbox.closeCompose = function() {
  $(".sm-send-container").addClass("closed")
  setTimeout(function() {
    $(".sm-send-container").addClass("sm-hidden")
  }, 200)
}

sm.inbox.send = function(to, subject, body) {
  $.post("/inbox/send", {
    to: to,
    subject: subject,
    body: body
  }, function(res) {
    if (res.status == "success") {
      alert("Successfully sent email")
      sm.inbox.closeCompose()
    } else {
      alert("Failed to send email: " + res.error)
    }
  }, "json")
}
