(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("Portal Administration"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("How-to articles for the people who maintain the ITAM Program portal: what each page shows, where its content lives, and how to change it."),
    notice: gs.getMessage("Only ITAM portal editors can see this tab and these articles."),
    manage: gs.getMessage("Manage articles"),
    filterLabel: gs.getMessage("Filter by topic"),
    allTopics: gs.getMessage("All"),
    searchLabel: gs.getMessage("Search admin articles"),
    clearSearch: gs.getMessage("Clear search"),
    updated: gs.getMessage("Updated {0}"),
    open: gs.getMessage("Read article"),
    opensNewWindow: gs.getMessage("opens in a new window"),
    other: gs.getMessage("Other"),
    shownOne: gs.getMessage("1 article shown"),
    shownMany: gs.getMessage("{0} articles shown"),
    noArticles: gs.getMessage("Admin articles haven't been published yet."),
    noMatches: gs.getMessage("No articles match your search or filter."),
    clearFilters: gs.getMessage("Clear search and filter"),
    noAccess: gs.getMessage("This section is for ITAM portal editors."),
    loadError: gs.getMessage("Admin articles could not be loaded. Please try again later."),
  };

  // The tab is already hidden from non-editors; this keeps the widget safe if it is placed elsewhere
  data.canView = gs.hasRole("x_1026751_itsm_ins.itam_portal_editor");
  data.loadError = false;
  data.groups = [];
  data.total = 0;
  if (!data.canView) {
    return;
  }

  var kbId = String(options.knowledge_base || "");
  if (!/^[0-9a-f]{32}$/.test(kbId)) {
    gs.error("ITAM Admin Knowledge: the knowledge_base option is not a sys_id");
    data.loadError = true;
    return;
  }
  data.manageUrl = "/kb_knowledge_list.do?sysparm_query=" + encodeURIComponent("kb_knowledge_base=" + kbId + "^ORDERBYnumber");

  try {
    var byCategory = {};
    var gr = new GlideRecordSecure("kb_knowledge");
    gr.addQuery("kb_knowledge_base", kbId);
    gr.addQuery("workflow_state", "published");
    gr.addQuery("active", true);
    // Article numbers set the reading order, starting with the overview
    gr.orderBy("number");
    gr.query();
    while (gr.next()) {
      var category = gr.getValue("kb_category") || "other";
      if (!byCategory[category]) {
        byCategory[category] = {
          value: category,
          label: gr.getValue("kb_category") ? gr.getDisplayValue("kb_category.label") : data.text.other,
          items: [],
        };
        data.groups.push(byCategory[category]);
      }
      byCategory[category].items.push({
        id: gr.getUniqueValue(),
        title: gr.getValue("short_description"),
        description: gr.getValue("meta_description") || "",
        number: gr.getValue("number"),
        updated: new GlideDateTime(gr.getValue("sys_updated_on")).getLocalDate().getByFormat("MMMM d, yyyy"),
        url: "?id=kb_article&sys_id=" + gr.getUniqueValue(),
      });
      data.total++;
    }
  } catch (e) {
    gs.error("ITAM Admin Knowledge: " + e);
    data.loadError = true;
  }
})();
