(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("Roadmap Timeline"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("When each project runs, by workstream. Select a project to see its details."),
    projectColumn: gs.getMessage("Project"),
    today: gs.getMessage("Today"),
    legendLabel: gs.getMessage("Status key"),
    datesLabel: gs.getMessage("{0} to {1}"),
    unscheduledHeading: gs.getMessage("Not Yet Scheduled"),
    unscheduledIntro: gs.getMessage("Dates for these projects will be added as planning finishes."),
    chartLabel: gs.getMessage("Project timeline. Scroll sideways to see all dates."),
    noProjects: gs.getMessage("No projects have dates yet. The timeline fills in as the program team schedules projects."),
    loadError: gs.getMessage("The roadmap timeline could not be loaded. Please try again later."),
  };

  var projectPage = String(options.project_page || "itam_project");
  data.projectPage = projectPage === "none" ? "" : projectPage;
  data.showUnscheduled = String(options.show_unscheduled) !== "false";
  data.loadError = false;
  data.lanes = [];
  data.quarters = [];
  data.years = [];
  data.unscheduled = [];
  data.statuses = [];
  data.todayPct = null;

  var DAY = 86400000;
  function toUtc(value) {
    var p = String(value).split("-");
    return Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  function quarterStart(ms) {
    var d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1);
  }
  function round(n) {
    return Math.round(n * 1000) / 1000;
  }

  try {
    var util = new ITAMRoadmapUtil();
    var statuses = String(options.statuses || "in_progress,planned,completed");
    var split = util.getScheduledProjects(statuses);
    data.statuses = util.getStatuses(statuses);
    data.unscheduled = split.unscheduled;

    if (split.scheduled.length) {
      var today = toUtc(new GlideDate().getValue());
      var min = today;
      var max = today;
      var i;
      for (i = 0; i < split.scheduled.length; i++) {
        min = Math.min(min, toUtc(split.scheduled[i].startValue));
        max = Math.max(max, toUtc(split.scheduled[i].endValue) + DAY);
      }

      // Whole calendar quarters around every project and today
      var start = quarterStart(min);
      var endQuarter = new Date(quarterStart(max - 1));
      var end = Date.UTC(endQuarter.getUTCFullYear(), endQuarter.getUTCMonth() + 3, 1);
      var total = end - start;
      var pct = function (ms) {
        return round(((ms - start) / total) * 100);
      };

      var cursor = start;
      var yearMap = {};
      while (cursor < end) {
        var d = new Date(cursor);
        var next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1);
        var year = String(d.getUTCFullYear());
        data.quarters.push({
          id: year + "q" + (d.getUTCMonth() / 3 + 1),
          label: "Q" + (d.getUTCMonth() / 3 + 1),
          left: pct(cursor),
          width: round(pct(next) - pct(cursor)),
        });
        if (!yearMap[year]) {
          yearMap[year] = { id: year, label: year, left: pct(cursor), width: 0 };
          data.years.push(yearMap[year]);
        }
        yearMap[year].width = round(pct(next) - yearMap[year].left);
        cursor = next;
      }

      data.todayPct = pct(today);

      var lanesByWs = {};
      for (i = 0; i < split.scheduled.length; i++) {
        var p = split.scheduled[i];
        var s = toUtc(p.startValue);
        var e = toUtc(p.endValue) + DAY;
        p.left = pct(s);
        // Keep very short projects visible
        p.width = Math.max(round(pct(e) - pct(s)), 1.2);
        p.datesText = String(data.text.datesLabel).replace("{0}", p.startDate).replace("{1}", p.endDate);
        (lanesByWs[p.workstream] = lanesByWs[p.workstream] || []).push(p);
      }
      var workstreams = util.getWorkstreams();
      for (i = 0; i < workstreams.length; i++) {
        var items = lanesByWs[workstreams[i].value];
        if (!items) {
          continue;
        }
        items.sort(function (a, b) {
          return a.startValue < b.startValue ? -1 : a.startValue > b.startValue ? 1 : 0;
        });
        data.lanes.push({
          value: workstreams[i].value,
          label: workstreams[i].label,
          icon: workstreams[i].icon,
          items: items,
        });
      }
    }
  } catch (err) {
    gs.error("ITAM Roadmap Gantt: " + err);
    data.loadError = true;
  }
})();
