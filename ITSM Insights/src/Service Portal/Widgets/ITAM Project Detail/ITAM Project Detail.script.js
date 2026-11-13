(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    back: gs.getMessage("Back to the program roadmap"),
    breadcrumbLabel: gs.getMessage("Breadcrumb"),
    programLabel: gs.getMessage("Program"),
    workstreamLabel: gs.getMessage("Workstream"),
    statusLabel: gs.getMessage("Status"),
    healthLabel: gs.getMessage("Health"),
    phaseLabel: gs.getMessage("Phase"),
    startLabel: gs.getMessage("Start"),
    endLabel: gs.getMessage("End"),
    ownerLabel: gs.getMessage("Program owner"),
    progressLabel: gs.getMessage("Progress"),
    percentLabel: gs.getMessage("{0}% complete"),
    notScheduled: gs.getMessage("To be scheduled"),
    statusReport: gs.getMessage("Project status report"),
    moreInfo: gs.getMessage("More information"),
    opensNewWindow: gs.getMessage("opens in a new window"),
    overviewHeading: gs.getMessage("About This Project"),
    noDescription: gs.getMessage("More details will be shared as the project progresses."),
    scopeHeading: gs.getMessage("Scope"),
    teamHeading: gs.getMessage("Project Team"),
    phasesHeading: gs.getMessage("Project Phases"),
    previousPhase: gs.getMessage("Previous phase"),
    nextPhase: gs.getMessage("Next phase"),
    goalHeading: gs.getMessage("Supports Program Goal"),
    viewGoals: gs.getMessage("View all key goals"),
    relatedHeading: gs.getMessage("Other Current Projects"),
    viewRoadmap: gs.getMessage("View the full roadmap"),
    emailPerson: gs.getMessage("Email {0}"),
    notFoundTitle: gs.getMessage("Project Not Found"),
    notFound: gs.getMessage("This project doesn't exist, is no longer active, or you don't have access to it."),
    loadError: gs.getMessage("This project could not be loaded. Please try again later."),
  };

  data.roadmapPage = options.roadmap_page || "itam_roadmap";
  data.projectPage = String($sp.getParameter("id") || "itam_project");
  data.showRelated = String(options.show_related) !== "false";
  data.project = null;
  data.related = [];
  data.loadError = false;

  try {
    var util = new ITAMRoadmapUtil();
    data.project = util.getProject(String($sp.getParameter("sys_id") || ""));
    if (data.project && data.showRelated) {
      data.related = util
        .getProjects("in_progress")
        .filter(function (p) {
          return p.id !== data.project.id;
        })
        .slice(0, 5);
    }
  } catch (e) {
    gs.error("ITAM Project Detail: " + e);
    data.loadError = true;
  }
})();
