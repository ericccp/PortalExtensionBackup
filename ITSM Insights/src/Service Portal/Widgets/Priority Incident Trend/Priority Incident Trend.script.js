(function () {
  // ---- Options & config ----
  var weeksCount = parseInt(options.weeks_count, 10) || 8;
  if (weeksCount < 2) {
    weeksCount = 2;
  }

  var priorities = String(options.priorities || "1,2")
    .split(",")
    .map(function (p) {
      return p.trim();
    })
    .filter(function (p) {
      return /^\d+$/.test(p);
    });
  if (priorities.length === 0) {
    priorities = ["1", "2"];
  }
  var priorityList = priorities.join(",");
  var showTopCause = String(options.show_top_cause) !== "false";

  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("Priority incident trend"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("P1 and P2 incidents opened per week, last {0} weeks", [
          String(weeksCount),
        ]),
    openIncidentsLabel: gs.getMessage("Open incidents"),
    openNowLabel: gs.getMessage("Open now"),
    mttrLabel: gs.getMessage("Median time to restore"),
    trendLabel: gs.getMessage("This week vs. {0}-week average", [
      String(weeksCount),
    ]),
    legendP1: gs.getMessage("P1"),
    legendP2: gs.getMessage("P2"),
    topCausePrefix: gs.getMessage("Top cause"),
    noIncidentsMessage: gs.getMessage("No matching incidents in this period."),
    noLocationMessage: gs.getMessage(
      "Select a location above to see incident trends.",
    ),
    loadingMessage: gs.getMessage("Loading incident trends..."),
    loadError: gs.getMessage(
      "This widget could not load incident data. Please try again later.",
    ),
  };

  // Base link has no location filter yet; a location is appended once one is selected
  var incidentListBase =
    options.incident_list_url ||
    "/incident_list.do?sysparm_query=priorityIN" +
      priorityList +
      "^active=true";

  data.loadError = false;
  data.noLocation = true;
  data.incidentListUrl = incidentListBase;
  data.stats = { openNow: 0, mttrDisplay: "\u2014", trendDisplay: "\u2014" };
  data.weeks = [];
  data.gridLines = [0];
  data.gridMax = 1;
  data.topCause = null;
  data.footer = {
    source: options.footer_source_label
      ? gs.getMessage(options.footer_source_label)
      : gs.getMessage("ITSM"),
    note: "",
  };

  // Site Status Header broadcasts a comma-separated list of cmn_location sys_ids
  function sanitizeLocationIds(raw) {
    return String(raw || "")
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return /^[0-9a-f]{32}$/i.test(s);
      });
  }

  // Everything below is scoped to the location(s) picked in Site Status Header
  function loadIncidentData(locationList) {
    var result = {
      incidentListUrl: options.incident_list_url
        ? options.incident_list_url
        : incidentListBase + "^locationIN" + locationList,
      stats: { openNow: 0, mttrDisplay: "\u2014", trendDisplay: "\u2014" },
      weeks: [],
      gridLines: [0],
      gridMax: 1,
      topCause: null,
      footerNote: "",
    };

    // ---- Build week boundaries (Sunday-start, UTC) ----
    var now = new GlideDateTime();
    var dayOfWeek = now.getDayOfWeekUTC(); // 1=Mon ... 7=Sun
    var daysSinceSunday = dayOfWeek % 7;

    var weekStarts = [];
    var i;
    for (i = weeksCount - 1; i >= 0; i--) {
      var ws = new GlideDateTime(now);
      ws.addDaysUTC(-(daysSinceSunday + 7 * i));
      ws.setValue(ws.getValue().split(" ")[0] + " 00:00:00");
      weekStarts.push(ws);
    }

    function countByPriority(startGdt, endGdt) {
      var counts = {};
      var p;
      for (p = 0; p < priorities.length; p++) {
        counts[priorities[p]] = 0;
      }
      var ga = new GlideAggregate("incident");
      ga.addQuery("sys_created_on", ">=", startGdt);
      ga.addQuery("sys_created_on", "<", endGdt);
      ga.addQuery("priority", "IN", priorityList);
      ga.addQuery("location", "IN", locationList);
      ga.groupBy("priority");
      ga.addAggregate("COUNT");
      ga.query();
      while (ga.next()) {
        var pr = ga.getValue("priority");
        counts[pr] = parseInt(ga.getAggregate("COUNT"), 10) || 0;
      }
      return counts;
    }

    var monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    var previousMonth = -1;
    var maxCount = 1;
    var totalInPeriod = 0;
    var currentWeekTotal = 0;
    var weekTotals = [];
    var lastWeekLabel = "";

    for (i = 0; i < weekStarts.length; i++) {
      var weekEnd = new GlideDateTime(weekStarts[i]);
      weekEnd.addDaysUTC(7);

      var counts = countByPriority(weekStarts[i], weekEnd);
      var p1 = counts[priorities[0]] || 0;
      var p2 = priorities.length > 1 ? counts[priorities[1]] || 0 : 0;
      var weekTotal = 0;
      var pKey;
      for (pKey in counts) {
        if (counts.hasOwnProperty(pKey)) {
          weekTotal += counts[pKey];
        }
      }

      var dateParts = weekStarts[i].getValue().split(" ")[0].split("-");
      var month = parseInt(dateParts[1], 10);
      var day = parseInt(dateParts[2], 10);
      var label =
        month !== previousMonth
          ? monthNames[month - 1] + " " + day
          : String(day);
      previousMonth = month;

      var isCurrent = i === weekStarts.length - 1;
      if (isCurrent) {
        lastWeekLabel = monthNames[month - 1] + " " + day;
        currentWeekTotal = weekTotal;
      }

      result.weeks.push({
        label: label,
        p1: p1,
        p2: p2,
        isCurrent: isCurrent,
      });

      weekTotals.push(weekTotal);
      totalInPeriod += weekTotal;
      maxCount = Math.max(maxCount, p1, p2);
    }

    // ---- Gridlines & bar heights ----
    var gridMax = maxCount;
    var gridLines = [];
    var g;
    if (gridMax <= 6) {
      for (g = gridMax; g >= 0; g--) {
        gridLines.push(g);
      }
    } else {
      var step = Math.ceil(gridMax / 5);
      gridMax = step * 5;
      for (g = gridMax; g >= 0; g -= step) {
        gridLines.push(g);
      }
    }
    result.gridMax = gridMax;
    result.gridLines = gridLines;
    for (i = 0; i < result.weeks.length; i++) {
      result.weeks[i].p1Height = gridMax
        ? Math.round((result.weeks[i].p1 / gridMax) * 100)
        : 0;
      result.weeks[i].p2Height = gridMax
        ? Math.round((result.weeks[i].p2 / gridMax) * 100)
        : 0;
    }

    result.footerNote = lastWeekLabel
      ? gs.getMessage("Week of {0} still in progress", [lastWeekLabel])
      : "";

    // ---- Open now ----
    var gaOpen = new GlideAggregate("incident");
    gaOpen.addQuery("active", true);
    gaOpen.addQuery("priority", "IN", priorityList);
    gaOpen.addQuery("location", "IN", locationList);
    gaOpen.addAggregate("COUNT");
    gaOpen.query();
    if (gaOpen.next()) {
      result.stats.openNow = parseInt(gaOpen.getAggregate("COUNT"), 10) || 0;
    }

    // ---- Trend: this week vs period average ----
    var avgWeekCount = weekTotals.length
      ? totalInPeriod / weekTotals.length
      : 0;
    if (avgWeekCount > 0) {
      var ratio = Math.round((currentWeekTotal / avgWeekCount) * 10) / 10;
      result.stats.trendDisplay =
        (ratio % 1 === 0 ? ratio.toFixed(0) : ratio.toFixed(1)) + "x";
    }

    // ---- Median time to restore ----
    var durationsHours = [];
    var grR = new GlideRecordSecure("incident");
    grR.addQuery("priority", "IN", priorityList);
    grR.addQuery("location", "IN", locationList);
    grR.addQuery("sys_created_on", ">=", weekStarts[0]);
    grR.addNotNullQuery("resolved_at");
    grR.addNotNullQuery("opened_at");
    grR.setLimit(1000);
    grR.query();
    while (grR.next()) {
      if (!grR.canRead()) {
        continue;
      }
      var opened = new GlideDateTime(grR.getValue("opened_at"));
      var resolved = new GlideDateTime(grR.getValue("resolved_at"));
      var dur = GlideDateTime.subtract(opened, resolved);
      var hours = dur.getNumericValue() / 3600000;
      if (hours > 0) {
        durationsHours.push(hours);
      }
    }
    if (durationsHours.length) {
      durationsHours.sort(function (a, b) {
        return a - b;
      });
      var mid = Math.floor(durationsHours.length / 2);
      var medianHours =
        durationsHours.length % 2 !== 0
          ? durationsHours[mid]
          : (durationsHours[mid - 1] + durationsHours[mid]) / 2;
      result.stats.mttrDisplay = Math.round(medianHours * 10) / 10 + " h";
    }

    // ---- Top cause ----
    if (showTopCause) {
      function getTopGroup(fieldName) {
        var ga = new GlideAggregate("incident");
        ga.addQuery("priority", "IN", priorityList);
        ga.addQuery("location", "IN", locationList);
        ga.addQuery("sys_created_on", ">=", weekStarts[0]);
        ga.addNotNullQuery(fieldName);
        ga.groupBy(fieldName);
        ga.addAggregate("COUNT");
        ga.query();
        var best = null;
        while (ga.next()) {
          var count = parseInt(ga.getAggregate("COUNT"), 10) || 0;
          if (count > 0 && (!best || count > best.count)) {
            best = {
              label: ga.getDisplayValue(fieldName) || ga.getValue(fieldName),
              count: count,
            };
          }
        }
        return best;
      }

      var topGroup = getTopGroup("subcategory") || getTopGroup("category");
      if (topGroup && totalInPeriod > 0) {
        result.topCause = {
          label: topGroup.label,
          count: topGroup.count,
          total: totalInPeriod,
        };
      }
    }

    return result;
  }

  // ---- Client round-trip: load data once Site Status Header reports a location ----
  if (input && input.action === "getData") {
    var locationIds = sanitizeLocationIds(input.locationId);
    data.noLocation = locationIds.length === 0;
    if (!data.noLocation) {
      try {
        var loaded = loadIncidentData(locationIds.join(","));
        data.incidentListUrl = loaded.incidentListUrl;
        data.stats = loaded.stats;
        data.weeks = loaded.weeks;
        data.gridLines = loaded.gridLines;
        data.gridMax = loaded.gridMax;
        data.topCause = loaded.topCause;
        data.footer.note = loaded.footerNote;
      } catch (e) {
        gs.error("Priority Incident Trend widget: " + e);
        data.loadError = true;
        data.weeks = [];
      }
    }
  }
})();

