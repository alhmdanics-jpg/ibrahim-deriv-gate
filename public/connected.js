(function () {
  "use strict";

  const logoutButton =
    document.getElementById("logout");


  async function logout() {

    if (!logoutButton) {
      return;
    }


    logoutButton.disabled = true;

    logoutButton.textContent =
      "LOGGING OUT...";


    try {

      await fetch(
        "/logout",
        {
          method: "POST",

          credentials: "same-origin",

          headers: {
            "Accept":
              "application/json"
          }
        }
      );

    } finally {

      window.location.href = "/";

    }

  }


  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      logout
    );

  }

})();
