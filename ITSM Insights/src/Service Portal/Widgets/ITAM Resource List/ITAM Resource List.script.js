(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("Training and Documentation"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("Courses, guides and reference material for anyone who works with IT assets at Ryder."),
    filterLabel: gs.getMessage("Filter by type"),
    allTypes: gs.getMessage("All"),
    searchLabel: gs.getMessage("Search training and documentation"),
    clearSearch: gs.getMessage("Clear search"),
    minutes: gs.getMessage("{0} min"),
    durationLabel: gs.getMessage("Duration"),
    audienceLabel: gs.getMessage("Audience"),
    open: gs.getMessage("Open"),
    comingSoon: gs.getMessage("Link coming soon"),
    opensNewWindow: gs.getMessage("opens in a new window"),
    shownOne: gs.getMessage("1 resource shown"),
    shownMany: gs.getMessage("{0} resources shown"),
    noResources: gs.getMessage("Training and documentation will be added here soon."),
    noMatches: gs.getMessage("No resources match your search or filter."),
    clearFilters: gs.getMessage("Clear search and filter"),
    loadError: gs.getMessage("Training and documentation could not be loaded. Please try again later."),
  };

  data.loadError = false;
  data.groups = [];
  try {
    data.groups = new ITAMPortalUtil().getResources(options.types || "");
  } catch (e) {
    gs.error("ITAM Resource List: " + e);
    data.loadError = true;
  }
  data.total = 0;
  for (var i = 0; i < data.groups.length; i++) {
    data.total += data.groups[i].items.length;
  }
})();
