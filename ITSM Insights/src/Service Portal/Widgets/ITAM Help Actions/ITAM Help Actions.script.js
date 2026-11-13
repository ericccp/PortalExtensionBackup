(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("How Can We Help?"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("Pick the option that fits. Check the known issues below first: your problem may already have a workaround."),
    opensNewWindow: gs.getMessage("opens in a new window"),
    noActions: gs.getMessage("Support options haven't been set up yet. Please contact the Service Desk."),
  };

  var util = new ITAMPortalUtil();
  function safe(url) {
    url = String(url || "").trim();
    return /^(\?|\/|https?:\/\/)/i.test(url) ? url : "";
  }

  // Each action's link lives in a system property so admins can repoint it without code changes
  var definitions = [
    {
      id: "issue",
      icon: "fa-exclamation-circle",
      title: gs.getMessage("Something Isn't Working"),
      description: gs.getMessage("An asset record is wrong, a form fails, or a process isn't behaving as intended. Report it as an incident."),
      label: gs.getMessage("Report an issue"),
      url: safe(util.getSetting("report_issue_url")),
    },
    {
      id: "consult",
      icon: "fa-comments-o",
      title: gs.getMessage("Request or Question"),
      description: gs.getMessage("Need a change to an ITAM process, or advice on how something should work? Request a Service Management Office consultation."),
      label: gs.getMessage("Request a consultation"),
      url: safe(util.getSetting("consultation_url")),
    },
    {
      id: "dashboard",
      icon: "fa-bar-chart",
      title: gs.getMessage("Dashboards and Reporting"),
      description: gs.getMessage("Can't see an ITAM dashboard, or need help reading one? Request reporting and dashboard assistance."),
      label: gs.getMessage("Request dashboard access"),
      url: safe(util.getSetting("dashboard_access_url")),
    },
  ];

  var email = util.getSetting("contact_email");
  if (email) {
    definitions.push({
      id: "email",
      icon: "fa-envelope-o",
      title: gs.getMessage("Talk to the Program Team"),
      description: gs.getMessage("Questions about the program itself, or think your team should be involved? Email us directly."),
      label: gs.getMessage("Email the program team"),
      url: "mailto:" + email,
    });
  }

  data.actions = [];
  for (var i = 0; i < definitions.length; i++) {
    if (definitions[i].url) {
      definitions[i].external = /^https?:/i.test(definitions[i].url);
      data.actions.push(definitions[i]);
    }
  }
})();
