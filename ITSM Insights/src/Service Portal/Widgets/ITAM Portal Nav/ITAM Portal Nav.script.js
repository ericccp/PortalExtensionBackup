(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    brand: options.brand_label
      ? gs.getMessage(options.brand_label)
      : gs.getMessage("IT Asset Management Program"),
    navLabel: gs.getMessage("ITAM Program sections"),
  };

  data.showIcons = String(options.show_icons) !== "false";

  // Section tabs. "match" lists other page ids that keep a tab highlighted (detail pages).
  var items = [
    { id: "home", label: gs.getMessage("Home"), icon: "fa-home", page: "itam_home", match: [] },
    { id: "program", label: gs.getMessage("Program"), icon: "fa-map-o", page: "itam_roadmap", match: ["itam_project"] },
    { id: "governance", label: gs.getMessage("Governance"), icon: "fa-sitemap", page: "itam_governance", match: [] },
    { id: "stakeholders", label: gs.getMessage("Stakeholders"), icon: "fa-bullhorn", page: "itam_stakeholders", match: [] },
    { id: "learning", label: gs.getMessage("Learning"), icon: "fa-graduation-cap", page: "itam_learning", match: [] },
    { id: "policy", label: gs.getMessage("Policy & Standards"), icon: "fa-gavel", page: "itam_policy", match: ["itam_documents"] },
    { id: "help", label: gs.getMessage("Get Help"), icon: "fa-life-ring", page: "itam_help", match: [] },
  ];

  var current = String($sp.getParameter("id") || "");
  data.items = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    item.active = item.page === current || item.match.indexOf(current) > -1;
    delete item.match;
    data.items.push(item);
  }
  data.homePage = items[0].page;
})();
