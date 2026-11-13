(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("Project Roadmap"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage(
          "Current and completed projects across the ITAM program. Projects are updated as the program grows."
        ),
    filterLabel: gs.getMessage("Filter by workstream"),
    allWorkstreams: gs.getMessage("All workstreams"),
    moreDetails: gs.getMessage("More details"),
    lessDetails: gs.getMessage("Fewer details"),
    showAll: gs.getMessage("Show all {0}"),
    showFewer: gs.getMessage("Show fewer"),
    countLabel: gs.getMessage("{0} projects"),
    resultsOne: gs.getMessage("1 project shown"),
    resultsMany: gs.getMessage("{0} projects shown"),
    phaseLabel: gs.getMessage("Phase"),
    startLabel: gs.getMessage("Start"),
    endLabel: gs.getMessage("End"),
    workstreamLabel: gs.getMessage("Workstream"),
    moreInfo: gs.getMessage("More information"),
    opensNewWindow: gs.getMessage("opens in a new window"),
    noDetails: gs.getMessage(
      "More details will be shared as the project progresses."
    ),
    emptyColumn: gs.getMessage("No matching projects"),
    noProjects: gs.getMessage("No projects have been added to the roadmap yet."),
    noMatches: gs.getMessage("No projects match your search or filter."),
    clearFilters: gs.getMessage("Clear search and filters"),
    loadError: gs.getMessage(
      "The roadmap could not be loaded. Please try again later."
    ),
  };

  // ---- Options & config ----
  var statuses = String(options.statuses || "in_progress,planned,completed");
  var collapseAfter = parseInt(options.collapse_after, 10);
  data.collapseAfter = isNaN(collapseAfter) || collapseAfter < 0 ? 6 : collapseAfter;
  data.layout = options.layout === "grid" ? "grid" : "columns";
  data.showFilters = String(options.show_filters) !== "false";
  // Project titles link to the project detail page; "none" turns the links off
  var projectPage = String(options.project_page || "itam_project");
  data.projectPage = projectPage === "none" ? "" : projectPage;
  data.hideEmptyColumns = String(options.hide_empty_columns) !== "false";

  data.loadError = false;
  data.columns = [];
  data.workstreams = [];
  data.total = 0;

  try {
    var util = new ITAMRoadmapUtil();
    var projects = util.getProjects(statuses);
    var statusList = util.getStatuses(statuses);
    var usedWorkstreams = {};
    var i;

    for (i = 0; i < projects.length; i++) {
      usedWorkstreams[projects[i].workstream] = true;
    }

    for (i = 0; i < statusList.length; i++) {
      var items = projects.filter(function (p) {
        return p.status === statusList[i].value;
      });
      if (!items.length && data.hideEmptyColumns) {
        continue;
      }
      data.columns.push({
        value: statusList[i].value,
        label: statusList[i].label,
        icon: statusList[i].icon,
        items: items,
      });
    }

    // Only offer workstream filters that have projects
    data.workstreams = util.getWorkstreams().filter(function (ws) {
      return usedWorkstreams[ws.value];
    });
    data.total = projects.length;
  } catch (e) {
    gs.error("ITAM Roadmap Board: " + e);
    data.loadError = true;
  }
})();
