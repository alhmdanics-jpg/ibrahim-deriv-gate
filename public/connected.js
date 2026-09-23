(function () {
  "use strict";

  const logoutButton = document.getElementById("logout");

  async function logout() {
    if (!logoutButton) {
      return;
    }

    logoutButton.disabled = true;
    logoutButton.textContent = "LOGGING OUT...";

    try {
      const response = await fetch("/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      window.location.href = "/";
    } catch (error) {
      window.location.href = "/";
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }
})();
