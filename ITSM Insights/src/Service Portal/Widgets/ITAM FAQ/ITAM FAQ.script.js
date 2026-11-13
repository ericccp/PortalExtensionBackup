(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("Frequently Asked Questions"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("Quick answers about the ITAM program, who it affects, and how it works in ServiceNow."),
    searchLabel: gs.getMessage("Search questions"),
    clearSearch: gs.getMessage("Clear search"),
    expandAll: gs.getMessage("Expand all"),
    collapseAll: gs.getMessage("Collapse all"),
    shownOne: gs.getMessage("1 question shown"),
    shownMany: gs.getMessage("{0} questions shown"),
    noFaqs: gs.getMessage("Questions and answers will be added here soon."),
    noMatches: gs.getMessage("No questions match your search."),
    stillStuck: gs.getMessage("Didn't find your answer?"),
    getHelp: gs.getMessage("Contact the program team"),
    loadError: gs.getMessage("FAQs could not be loaded. Please try again later."),
  };

  data.helpPage = options.help_page || "itam_help";
  data.loadError = false;
  data.groups = [];
  try {
    data.groups = new ITAMPortalUtil().getFaqs();
  } catch (e) {
    gs.error("ITAM FAQ: " + e);
    data.loadError = true;
  }
  data.total = 0;
  for (var i = 0; i < data.groups.length; i++) {
    data.total += data.groups[i].items.length;
  }
})();
