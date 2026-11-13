(function () {
  var groups = ["program_team", "steering", "advisory", "stakeholder"];
  data.group = groups.indexOf(options.group) > -1 ? options.group : "program_team";

  var defaultTitles = {
    program_team: gs.getMessage("Program Team"),
    steering: gs.getMessage("Steering Committee"),
    advisory: gs.getMessage("Advisory Committee"),
    stakeholder: gs.getMessage("Stakeholders"),
  };

  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : defaultTitles[data.group],
    intro: options.intro ? gs.getMessage(options.intro) : "",
    azLabel: gs.getMessage("Filter by last name"),
    all: gs.getMessage("All"),
    letterFilter: gs.getMessage("Last names starting with {0}"),
    countOne: gs.getMessage("1 person"),
    countMany: gs.getMessage("{0} people"),
    shownOne: gs.getMessage("1 person shown"),
    shownMany: gs.getMessage("{0} people shown"),
    emailPerson: gs.getMessage("Email {0}"),
    roleLabel: gs.getMessage("Program role"),
    empty: options.empty_message
      ? gs.getMessage(options.empty_message)
      : gs.getMessage("Members will be listed here once the group is confirmed."),
    loadError: gs.getMessage("This directory could not be loaded. Please try again later."),
  };

  data.layout = options.layout === "compact" ? "compact" : "cards";
  data.showAz = String(options.show_az_filter) !== "false";
  data.loadError = false;
  data.people = [];

  try {
    data.people = new ITAMPortalUtil().getPeople(data.group);
  } catch (e) {
    gs.error("ITAM People Directory: " + e);
    data.loadError = true;
  }

  // A-Z bar: letters with nobody are disabled; only worth showing for larger groups
  var used = {};
  for (var i = 0; i < data.people.length; i++) {
    used[data.people[i].letter] = true;
  }
  data.letters = [];
  var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (var j = 0; j < alphabet.length; j++) {
    data.letters.push({ value: alphabet.charAt(j), enabled: !!used[alphabet.charAt(j)] });
  }
  data.showAz = data.showAz && data.people.length > 8;
})();
