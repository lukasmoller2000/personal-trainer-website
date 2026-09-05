(function () {
  var errorEl = document.getElementById("stripe-test-error");
  var allowedProductIds = { session: true, "pack-5": true };
  var buttons = [
    document.getElementById("stripe-test-checkout"),
    document.getElementById("stripe-test-checkout-pack-5"),
  ].filter(Boolean);

  function showError(message) {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
    console.info("[stripe-test] error", message);
  }

  function readCheckoutUrl(data) {
    if (!data || typeof data !== "object") return null;
    var url = data.url || data.checkoutUrl;
    return typeof url === "string" && url.length > 0 ? url : null;
  }

  function bindButton(button) {
    if (button.getAttribute("data-bound") === "1") return;
    button.setAttribute("data-bound", "1");

    function startCheckout(event) {
      if (event) event.preventDefault();
      if (button.disabled) return;

      var payload;
      try {
        payload = JSON.parse(button.getAttribute("data-payload") || "");
      } catch {
        showError("Ugyldig test-payload");
        return;
      }

      if (!payload || !allowedProductIds[payload.productId]) {
        showError("Ugyldig test-payload");
        return;
      }

      delete payload.amount;
      delete payload.price;

      var idleLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Åbner Stripe…";
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }

      var keys = Object.keys(payload);
      console.info("[stripe-test] request sent", {
        method: "POST",
        path: "/api/checkout",
        productId: payload.productId,
        keys: keys,
      });

      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (response) {
          return response.text().then(function (text) {
            var data = null;
            if (text) {
              try {
                data = JSON.parse(text);
              } catch {
                data = null;
              }
            }
            var url = readCheckoutUrl(data);
            console.info("[stripe-test] response", {
              status: response.status,
              productId: payload.productId,
              hasCheckoutUrl: Boolean(url),
            });
            if (!response.ok) {
              var message =
                data && typeof data.error === "string"
                  ? data.error
                  : "Kunne ikke starte test-betaling";
              throw new Error(message);
            }
            if (!url) {
              throw new Error("Stripe returnerede ingen checkout-url");
            }
            window.location.assign(url);
          });
        })
        .catch(function (err) {
          button.disabled = false;
          button.textContent = idleLabel;
          showError(err && err.message ? err.message : "Kunne ikke starte test-betaling");
        });
    }

    button.addEventListener("click", startCheckout);
    var form = button.closest("form");
    if (form && form.getAttribute("data-submit-bound") !== "1") {
      form.setAttribute("data-submit-bound", "1");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
      });
    }
  }

  buttons.forEach(bindButton);
})();
