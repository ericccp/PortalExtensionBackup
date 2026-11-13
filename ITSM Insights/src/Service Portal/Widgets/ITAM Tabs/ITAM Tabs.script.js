(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    tabsLabel: options.aria_label
      ? gs.getMessage(options.aria_label)
      : gs.getMessage("Page sections"),
    loadError: gs.getMessage("This section could not be loaded. Please try again later."),
  };

  // ITAM Program Portal Administration knowledge base (itam-portal/knowledge.now.ts)
  var ADMIN_KB = "9f11b116ffb4465baab2a1286409b63a";
  var EDITOR_ROLE = "x_1026751_itsm_ins.itam_portal_editor";

  // Each preset tab embeds one or more ITAM widgets. "search: true" marks the tab that the
  // ITAM Program Hero search jumps to. "roles" limits a tab to users with any of those roles.
  var presets = {
    program: [
      {
        id: "overview",
        label: "Overview",
        icon: "fa-compass",
        widgets: [{ id: "itam-program-overview", options: {} }],
      },
      {
        id: "roadmap",
        label: "Roadmap",
        icon: "fa-calendar",
        widgets: [{ id: "itam-roadmap-gantt", options: {} }],
      },
      {
        id: "projects",
        label: "Projects",
        icon: "fa-th-large",
        search: true,
        widgets: [{ id: "itam-roadmap-board", options: { collapse_after: "4" } }],
      },
      {
        id: "goals",
        label: "Key Goals",
        icon: "fa-bullseye",
        widgets: [{ id: "itam-key-goals", options: {} }],
      },
    ],
    governance: [
      {
        id: "program_team",
        label: "Program Team",
        icon: "fa-users",
        widgets: [{
          id: "itam-people-directory",
          options: {
            group: "program_team",
            heading: "Program Team",
            intro: "The people who plan, deliver and run the ITAM program day to day, together with our implementation partners.",
          },
        }],
      },
      {
        id: "steering",
        label: "Steering Committee",
        icon: "fa-compass",
        widgets: [{
          id: "itam-people-directory",
          options: {
            group: "steering",
            heading: "Steering Committee",
            intro: "Senior leaders who set the program's direction, approve scope and priorities, and clear the way when the program needs a decision.",
          },
        }],
      },
      {
        id: "advisory",
        label: "Advisory Committee",
        icon: "fa-comments-o",
        widgets: [{
          id: "itam-people-directory",
          options: {
            group: "advisory",
            heading: "Advisory Committee",
            intro: "Representatives from across Ryder who review proposed changes, share how they affect their teams, and carry program updates back to their areas.",
          },
        }],
      },
    ],
    learning: [
      {
        id: "training",
        label: "Training & Documentation",
        icon: "fa-graduation-cap",
        widgets: [{ id: "itam-resource-list", options: {} }],
      },
      {
        id: "faqs",
        label: "FAQs",
        icon: "fa-question-circle-o",
        widgets: [{ id: "itam-faq", options: {} }],
      },
      {
        id: "glossary",
        label: "Glossary",
        icon: "fa-book",
        widgets: [{ id: "itam-glossary", options: {} }],
      },
      {
        id: "admin",
        label: "Portal Admin",
        icon: "fa-lock",
        roles: [EDITOR_ROLE],
        widgets: [{ id: "itam-admin-knowledge", options: { knowledge_base: ADMIN_KB } }],
      },
    ],
  };

  function canSee(tab) {
    if (!tab.roles) {
      return true;
    }
    var roles = Array.isArray(tab.roles) ? tab.roles : String(tab.roles).split(",");
    for (var r = 0; r < roles.length; r++) {
      if (gs.hasRole(String(roles[r]).trim())) {
        return true;
      }
    }
    return false;
  }

  var preset = presets[options.preset] ? options.preset : "learning";
  var tabs = presets[preset];

  // A designer can supply their own tabs as JSON. Only ITAM portal widgets may be embedded.
  if (options.tabs) {
    try {
      var custom = JSON.parse(String(options.tabs));
      if (Array.isArray(custom) && custom.length) {
        tabs = custom;
      }
    } catch (e) {
      gs.warn("ITAM Tabs: tabs option is not valid JSON - using the preset. " + e);
    }
  }

  data.tabs = [];
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i] || {};
    var id = String(tab.id || "");
    if (!/^[a-z0-9_]+$/.test(id) || !tab.label || !canSee(tab)) {
      continue;
    }
    var widgets = [];
    var list = tab.widgets || [];
    for (var w = 0; w < list.length; w++) {
      var widgetId = String((list[w] && list[w].id) || "");
      if (!/^itam-[a-z0-9-]+$/.test(widgetId)) {
        continue;
      }
      try {
        var embedded = $sp.getWidget(widgetId, list[w].options || {});
        if (embedded) {
          widgets.push(embedded);
        }
      } catch (err) {
        gs.error("ITAM Tabs: could not embed " + widgetId + ": " + err);
      }
    }
    data.tabs.push({
      id: id,
      label: gs.getMessage(String(tab.label)),
      icon: /^fa-[a-z0-9-]+$/.test(String(tab.icon || "")) ? tab.icon : "",
      search: tab.search === true,
      widgets: widgets,
    });
  }

  // Deep link: ?tab=<id>, validated against the known tabs
  var requested = String($sp.getParameter("tab") || "");
  data.activeTab = data.tabs.length ? data.tabs[0].id : "";
  for (var t = 0; t < data.tabs.length; t++) {
    if (data.tabs[t].id === requested) {
      data.activeTab = requested;
    }
  }
})();
