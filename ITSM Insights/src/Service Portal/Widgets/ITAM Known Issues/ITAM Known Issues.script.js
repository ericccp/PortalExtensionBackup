(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("Known Issues"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("Problems the program team already knows about, with workarounds where we have them."),
    statusLabel: gs.getMessage("Status"),
    areaLabel: gs.getMessage("Affected area"),
    openedLabel: gs.getMessage("Reported"),
    resolvedLabel: gs.getMessage("Resolved"),
    workaround: gs.getMessage("Workaround"),
    details: gs.getMessage("Details"),
    hideDetails: gs.getMessage("Hide details"),
    showResolved: gs.getMessage("Show resolved issues ({0})"),
    hideResolved: gs.getMessage("Hide resolved issues"),
    openCountOne: gs.getMessage("1 open issue"),
    openCountMany: gs.getMessage("{0} open issues"),
    noOpen: options.empty_message
      ? gs.getMessage(options.empty_message)
      : gs.getMessage("No known issues right now. If something isn't working, report it using the options above."),
    loadError: gs.getMessage("Known issues could not be loaded. Please try again later."),
  };

  data.allowResolved = String(options.show_resolved_toggle) !== "false";
  data.loadError = false;
  data.issues = [];
  try {
    data.issues = new ITAMPortalUtil().getKnownIssues();
  } catch (e) {
    gs.error("ITAM Known Issues: " + e);
    data.loadError = true;
  }
  data.openCount = 0;
  data.resolvedCount = 0;
  for (var i = 0; i < data.issues.length; i++) {
    if (data.issues[i].resolvedFlag) {
      data.resolvedCount++;
    } else {
      data.openCount++;
    }
  }
})();
