function createInboxElement(email) {
  // TODO: XSS PREVENTION
  email.date = new Date(email.date * 1000);

  email.subject = sm.mime.parseSubject(email.subject)

  if (!email.name || email.name.trim() == "") {
    email.name = email.email
  }

  var html = "<li>"
    + "<a href='#' id='email-" + email.id + "' class='email" + (email.marked_read == 0 && " unread" || "") + "' data-id='" + email.id + "'>"
      + "<div class='left'>"
        + "<span class='subject'>" + email.subject + "</span>"
        + "<span class='from'>" + email.name + "</span>"
      + "</div>"
      + "<span class='date'>" + sm.inbox.formatDate(email.date) + "</span>"
    + "</a></li>";

  $(".emails").append(html);
  $(".emails h3").hide();

  updateEmailActions(email.id);
}

function updateEmailActions(id) {
  $("#email-" + id).click(function(e) {
    e.preventDefault();
    $(".active").removeClass("active");
    $(this).addClass("active");
    $(this).removeClass("unread");

    var id = $(this).data("id");

    sm.inbox.retrieve(id, function(err, email, message) {
      sm.inbox.updateView(email, message);
      sm.inbox.openView();
    });
  })
}

$(document).ready(function() {
  sm.inbox.init(function() {
    $(".content-loader").fadeOut(function() {
      $(".main").fadeIn();
    });
  });

  sm.inbox.load(function(err, emails) {
    for (var i=0; i<emails.length; i++) {
      createInboxElement(emails[i]);
    }
  })

  $("#password-prompt-form").submit(function(e) {
    e.preventDefault();
    var password = $("#password-prompt").val();

    sm.inbox.promptSubmit(password);
  })

  $(".email-view").click(function() {
    sm.inbox.extendView();
  })

  $(".list-overlay").click(function() {
    sm.inbox.shrinkView();
  })
})
setInterval(function() {
  $("#email-view-content-html").css("height", $(".email-view").height() - $(".email-header").height() + "px")
  $("#email-view-content-text").css("height", $(".email-view").height() - $(".email-header").height() + "px")
}, 100)
