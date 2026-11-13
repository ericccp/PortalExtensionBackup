(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    eyebrow: options.eyebrow
      ? gs.getMessage(options.eyebrow)
      : gs.getMessage("IT Asset Management"),
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("ITAM Program Roadmap"),
    intro: options.intro
      ? gs.getMessage(options.intro)
      : gs.getMessage(
          "In March 2026, the launch of the IT Asset Management (ITAM) program ushered in a new way of capturing an accurate account of technology asset lifecycle costs and risks. Follow the program's progress, from current projects to completed milestones."
        ),
    homeLabel: gs.getMessage("Home"),
    breadcrumbLabel: gs.getMessage("Breadcrumb"),
    searchLabel: gs.getMessage("Search projects"),
    searchPlaceholder: gs.getMessage("Search projects"),
    clearSearch: gs.getMessage("Clear search"),
  };

  data.showSearch = String(options.show_search) !== "false";
  data.showBreadcrumb = String(options.show_breadcrumb) !== "false";
  data.style = options.style === "brand" ? "brand" : "light";
  data.homePage = options.home_page || "index";

  // Optional call-to-action buttons under the intro, each pointing at a portal page id
  data.actions = [];
  if (options.primary_label && options.primary_page) {
    data.actions.push({ id: "primary", label: gs.getMessage(options.primary_label), page: String(options.primary_page) });
  }
  if (options.secondary_label && options.secondary_page) {
    data.actions.push({ id: "secondary", label: gs.getMessage(options.secondary_label), page: String(options.secondary_page) });
  }
})();
