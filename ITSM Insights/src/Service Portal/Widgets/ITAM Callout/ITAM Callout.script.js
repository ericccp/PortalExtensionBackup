(function () {
  // Display text lives here so titles and messages can be updated in one place.
  // Heading, body and button labels come from instance options; the fallbacks keep an unconfigured instance readable.
  data.text = {
    eyebrow: options.eyebrow ? gs.getMessage(options.eyebrow) : "",
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("What Is IT Asset Management?"),
    emailLabel: options.email_label
      ? gs.getMessage(options.email_label)
      : gs.getMessage("Email the program team"),
    opensNewWindow: gs.getMessage("opens in a new window"),
  };

  var body = options.body
    ? gs.getMessage(options.body)
    : gs.getMessage(
        "IT Asset Management (ITAM) is the set of business practices that brings IT assets across every business unit into one view. It joins the financial, inventory, contractual and risk responsibilities for those assets so we can manage their whole lifecycle and make better tactical and strategic decisions."
      );
  // Blank lines in the body start a new paragraph
  data.paragraphs = String(body)
    .split(/\n\s*\n/)
    .map(function (p) {
      return p.trim();
    })
    .filter(function (p) {
      return !!p;
    });

  data.style = ["neutral", "brand", "tinted"].indexOf(options.style) > -1 ? options.style : "neutral";
  data.icon = /^fa-[a-z0-9-]+$/.test(String(options.icon || "")) ? String(options.icon) : "";

  // A button URL may come straight from the option or from one of this app's ITAM properties
  var util = new ITAMPortalUtil();
  function safeUrl(url) {
    url = String(url || "").trim();
    return /^(\?|\/|https?:\/\/|mailto:)/i.test(url) ? url : "";
  }
  function button(n) {
    var label = options["button" + n + "_label"];
    var property = options["button" + n + "_property"];
    var url = property ? util.getSetting(String(property)) : options["button" + n + "_url"];
    url = safeUrl(url);
    if (!label || !url) {
      return null;
    }
    return {
      id: "b" + n,
      label: gs.getMessage(label),
      url: url,
      external: /^https?:/i.test(url),
      secondary: n > 1,
    };
  }

  data.buttons = [];
  var b1 = button(1);
  var b2 = button(2);
  if (b1) data.buttons.push(b1);
  if (b2) data.buttons.push(b2);
  if (String(options.show_email) === "true") {
    var email = util.getSetting("contact_email");
    if (email) {
      data.buttons.push({
        id: "email",
        label: data.text.emailLabel,
        url: "mailto:" + email,
        external: false,
        secondary: data.buttons.length > 0,
        icon: "fa-envelope-o",
      });
    }
  }
})();
