(function () {
  data.mode = options.mode === "upcoming" ? "upcoming" : "past";

  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : data.mode === "upcoming"
        ? gs.getMessage("Next Town Hall")
        : gs.getMessage("Town Hall Notes and Recordings"),
    subtitle: options.subtitle ? gs.getMessage(options.subtitle) : "",
    recording: gs.getMessage("Recording"),
    notes: gs.getMessage("Notes"),
    join: gs.getMessage("Join the meeting"),
    noLinks: gs.getMessage("Recording and notes coming soon"),
    opensNewWindow: gs.getMessage("opens in a new window"),
    countOne: gs.getMessage("1 session"),
    countMany: gs.getMessage("{0} sessions"),
    at: gs.getMessage("at"),
    emptyUpcoming: options.empty_message
      ? gs.getMessage(options.empty_message)
      : gs.getMessage("No town hall is scheduled right now. Dates are announced in the stakeholder channel."),
    emptyPast: options.empty_message
      ? gs.getMessage(options.empty_message)
      : gs.getMessage("Recordings and notes will appear here after each town hall."),
    loadError: gs.getMessage("Events could not be loaded. Please try again later."),
  };

  var limit = parseInt(options.limit, 10);
  if (isNaN(limit) || limit < 0) {
    limit = data.mode === "upcoming" ? 1 : 0;
  }
  data.loadError = false;
  data.events = [];
  data.years = [];

  try {
    data.events = new ITAMPortalUtil().getEvents(options.type || "town_hall", data.mode, limit);
  } catch (e) {
    gs.error("ITAM Event Archive: " + e);
    data.loadError = true;
  }

  // Past events are grouped by year, newest first
  if (data.mode === "past") {
    var byYear = {};
    for (var i = 0; i < data.events.length; i++) {
      var ev = data.events[i];
      if (!byYear[ev.year]) {
        byYear[ev.year] = { year: ev.year, items: [] };
        data.years.push(byYear[ev.year]);
      }
      byYear[ev.year].items.push(ev);
    }
  }
})();
