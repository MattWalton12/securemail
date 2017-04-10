$(document).ready(function() {
  $("#register_form").submit(function(e) {
    e.preventDefault();
    var username = $("#register-username").val(),
      password = $("#register-password").val(),
      confirm = $("#register-password-confirm").val();

    if (password != confirm) {
      return alert("Both passwords must be the same!");
    }

    // TODO: check username before generating keys lols

    $("#register-button").hide();
    $(".loading-container").show();

    sm.users.register(username, password, function(err) {
      if (err) {
        $(".loading-container").hide();
        $("#register-button").show();
        return alert(err.message);
      } else {
        window.location.href = "/inbox";
      }
    });

  })
})
