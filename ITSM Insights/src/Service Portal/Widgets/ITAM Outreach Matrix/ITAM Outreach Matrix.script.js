(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("Outreach and Engagement Schedule"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage(
          "Where each department is in the rollout of each workstream. Dates can move as schedules change."
        ),
    departmentColumn: gs.getMessage("Department"),
    statusFilterLabel: gs.getMessage("Filter by status"),
    allStatuses: gs.getMessage("All statuses"),
    searchLabel: gs.getMessage("Search departments"),
    clearSearch: gs.getMessage("Clear search"),
    notRecorded: gs.getMessage("Not recorded"),
    tableLabel: gs.getMessage("Outreach status by department and workstream. Scroll sideways on small screens."),
    shownOne: gs.getMessage("1 department shown"),
    shownMany: gs.getMessage("{0} departments shown"),
    noRows: gs.getMessage("The outreach schedule hasn't been published yet."),
    noMatches: gs.getMessage("No departments match your search or filter."),
    clearFilters: gs.getMessage("Clear search and filter"),
    loadError: gs.getMessage("The outreach schedule could not be loaded. Please try again later."),
  };

  data.loadError = false;
  data.matrix = { workstreams: [], departments: [], statuses: [] };
  try {
    data.matrix = new ITAMPortalUtil().getOutreachMatrix();
  } catch (e) {
    gs.error("ITAM Outreach Matrix: " + e);
    data.loadError = true;
  }
})();
