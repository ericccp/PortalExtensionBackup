(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("Glossary"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("Terms you'll hear across the ITAM program, in plain language."),
    searchLabel: gs.getMessage("Search terms and definitions"),
    clearSearch: gs.getMessage("Clear search"),
    azLabel: gs.getMessage("Jump to letter"),
    jumpTo: gs.getMessage("Terms starting with {0}"),
    seeAlso: gs.getMessage("See also"),
    shownOne: gs.getMessage("1 term shown"),
    shownMany: gs.getMessage("{0} terms shown"),
    noTerms: gs.getMessage("Glossary terms will be added here soon."),
    noMatches: gs.getMessage("No terms match your search."),
    loadError: gs.getMessage("The glossary could not be loaded. Please try again later."),
  };

  data.loadError = false;
  data.terms = [];
  try {
    data.terms = new ITAMPortalUtil().getGlossary();
  } catch (e) {
    gs.error("ITAM Glossary: " + e);
    data.loadError = true;
  }
})();
