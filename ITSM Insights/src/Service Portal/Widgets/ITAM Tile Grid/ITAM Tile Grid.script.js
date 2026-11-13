(function () {
  // Display text lives here so titles and messages can be updated in one place
  var preset = ["explore", "lifecycle"].indexOf(options.preset) > -1 ? options.preset : "explore";
  var defaults = {
    explore: {
      title: gs.getMessage("Explore the Program"),
      subtitle: gs.getMessage("Everything about the ITAM program, in one place."),
    },
    lifecycle: {
      title: gs.getMessage("The IT Asset Lifecycle"),
      subtitle: gs.getMessage(
        "The policy covers every stage of an IT asset's life at Ryder, from planning a purchase to retiring the asset."
      ),
    },
  };
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : defaults[preset].title,
    subtitle: options.subtitle ? gs.getMessage(options.subtitle) : defaults[preset].subtitle,
    stepLabel: gs.getMessage("Step {0}"),
  };

  var presets = {
    explore: [
      { icon: "fa-map-o", page: "itam_roadmap", title: "Program and Roadmap", description: "Program areas and objectives, key goals, the roadmap timeline and every project." },
      { icon: "fa-sitemap", page: "itam_governance", title: "Governance", description: "Meet the program team and the committees that guide the program." },
      { icon: "fa-bullhorn", page: "itam_stakeholders", title: "Stakeholders and Outreach", description: "Where each department is in the rollout, plus town hall recordings and notes." },
      { icon: "fa-graduation-cap", page: "itam_learning", title: "Learning", description: "Training and documentation, answers to common questions, and a glossary of ITAM terms." },
      { icon: "fa-gavel", page: "itam_policy", title: "Policy and Standards", description: "The IT Asset Management Policy and the standards that support it." },
      { icon: "fa-life-ring", page: "itam_help", title: "Get Help", description: "Report a problem, request a consultation, and check known issues." },
    ],
    lifecycle: [
      { icon: "fa-lightbulb-o", title: "Plan", description: "Confirm the business need and check for existing assets or licenses before you buy." },
      { icon: "fa-shopping-cart", title: "Acquire", description: "Buy through approved procurement channels so every asset is recorded from day one." },
      { icon: "fa-barcode", title: "Inventory", description: "Receive, tag and record the asset in ServiceNow with its owner, location and cost." },
      { icon: "fa-truck", title: "Deploy", description: "Assign the asset to a person or service and keep the record current as it moves." },
      { icon: "fa-wrench", title: "Maintain", description: "Track support, warranty, licensing and refresh dates while the asset is in use." },
      { icon: "fa-recycle", title: "Retire", description: "Wipe, dispose of or redeploy the asset securely and close out its record." },
    ],
  };

  // A designer can replace the preset with a JSON array of {title, description, icon, page|url}
  var tiles = presets[preset];
  if (options.tiles) {
    try {
      var custom = JSON.parse(String(options.tiles));
      if (Array.isArray(custom) && custom.length) {
        tiles = custom;
      }
    } catch (e) {
      gs.warn("ITAM Tile Grid: tiles option is not valid JSON - using the preset. " + e);
    }
  }

  data.variant = preset === "lifecycle" ? "steps" : "links";
  data.tiles = [];
  for (var i = 0; i < tiles.length; i++) {
    var t = tiles[i] || {};
    if (!t.title) {
      continue;
    }
    var url = t.page ? "?id=" + t.page : String(t.url || "");
    if (url && !/^(\?|\/|https?:\/\/)/i.test(url)) {
      url = "";
    }
    data.tiles.push({
      id: "tile" + i,
      title: gs.getMessage(String(t.title)),
      description: t.description ? gs.getMessage(String(t.description)) : "",
      icon: /^fa-[a-z0-9-]+$/.test(String(t.icon || "")) ? t.icon : "fa-circle-o",
      url: data.variant === "links" ? url : "",
      external: /^https?:/i.test(url),
      step: data.text.stepLabel.replace("{0}", String(data.tiles.length + 1)),
    });
  }
})();
