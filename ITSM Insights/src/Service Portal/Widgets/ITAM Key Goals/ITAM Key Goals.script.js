(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("Key Goals"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("What the program has committed to deliver, how we'll know it's done, and the projects that get us there."),
    yearFilterLabel: gs.getMessage("Filter by year"),
    targetLabel: gs.getMessage("Target"),
    statusLabel: gs.getMessage("Status"),
    progressLabel: gs.getMessage("Progress"),
    percentLabel: gs.getMessage("{0}% complete"),
    criteriaHeading: gs.getMessage("Success criteria"),
    projectsHeading: gs.getMessage("Supporting projects"),
    noProjects: gs.getMessage("Projects will be linked as they are planned."),
    noGoals: gs.getMessage("Program goals haven't been published yet."),
    loadError: gs.getMessage("Program goals could not be loaded. Please try again later."),
  };

  var projectPage = String(options.project_page || "itam_project");
  data.projectPage = projectPage === "none" ? "" : projectPage;
  data.loadError = false;
  data.goals = [];
  data.years = [];

  try {
    var util = new ITAMPortalUtil();
    var fiscalYear = String(options.fiscal_year || "").trim();
    data.goals = util.getGoals(fiscalYear);
    data.years = fiscalYear ? [fiscalYear] : util.getFiscalYears();
  } catch (e) {
    gs.error("ITAM Key Goals: " + e);
    data.loadError = true;
  }

  // Start on the current year when it has goals, otherwise the newest year
  var thisYear = new GlideDateTime().getLocalDate().getByFormat("yyyy");
  data.selectedYear = data.years.indexOf(thisYear) > -1 ? thisYear : data.years[data.years.length - 1] || "";
})();
