(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    // No heading by default; the tiles usually sit directly under the page hero
    title: options.heading ? gs.getMessage(options.heading) : "",
    statsLabel: gs.getMessage("Program at a glance"),
    inProgress: gs.getMessage("Projects in progress"),
    planned: gs.getMessage("Projects planned"),
    completed: gs.getMessage("Projects completed"),
    areas: gs.getMessage("Program areas"),
    areasValue: gs.getMessage("HAM, SAM and Service Mapping"),
    launched: gs.getMessage("Program launched"),
    launchValue: options.launch_label
      ? gs.getMessage(options.launch_label)
      : gs.getMessage("March 2026"),
    multiYear: gs.getMessage("Multi-year, phased program"),
    loadError: gs.getMessage(
      "Program statistics could not be loaded. Please try again later."
    ),
  };

  data.layout = options.layout === "stack" ? "stack" : "row";
  data.loadError = false;
  data.tiles = [];

  try {
    var counts = new ITAMRoadmapUtil().getStatusCounts();

    data.tiles.push({
      id: "in_progress",
      icon: "fa-adjust",
      state: "info",
      label: data.text.inProgress,
      value: String(counts.in_progress),
    });
    // Planned only appears once the program team adds planned projects
    if (counts.planned > 0) {
      data.tiles.push({
        id: "planned",
        icon: "fa-circle-o",
        state: "purple",
        label: data.text.planned,
        value: String(counts.planned),
      });
    }
    data.tiles.push({
      id: "completed",
      icon: "fa-check-circle",
      state: "success",
      label: data.text.completed,
      value: String(counts.completed),
    });
    data.tiles.push({
      id: "areas",
      icon: "fa-th-large",
      state: "neutral",
      label: data.text.areas,
      value: "3",
      subtitle: data.text.areasValue,
    });
    data.tiles.push({
      id: "launched",
      icon: "fa-flag-checkered",
      state: "neutral",
      label: data.text.launched,
      value: data.text.launchValue,
      subtitle: data.text.multiYear,
    });
  } catch (e) {
    gs.error("ITAM Program Stats: " + e);
    data.loadError = true;
  }
})();
