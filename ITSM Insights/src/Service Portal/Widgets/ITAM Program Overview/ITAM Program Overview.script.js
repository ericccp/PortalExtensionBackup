(function () {
  // Display text lives here so titles and messages can be updated in one place.
  // Copy is condensed from the ITAM program overview.
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("Program Overview"),
    intro: options.intro
      ? gs.getMessage(options.intro)
      : gs.getMessage(
          "The Asset Management Program provides enterprise-class IT Asset Management as a foundational practice that supports key business initiatives. This multi-year program is delivered in phases across three areas of IT Asset Management."
        ),
    areasHeading: gs.getMessage("Program Areas"),
    includesLabel: gs.getMessage("Includes"),
    objectivesHeading: gs.getMessage("Program Objectives"),
    objectivesIntro: gs.getMessage(
      "The program's foremost goal is an accurate and complete centralized asset inventory in ServiceNow, along with improved HAM, SAM and IT Operations Management (ITOM) capabilities."
    ),
  };

  data.layout = options.layout === "compact" ? "compact" : "full";
  data.showIntro = String(options.show_intro) !== "false";
  data.showAreas = String(options.show_areas) !== "false";
  data.showObjectives = String(options.show_objectives) !== "false";

  data.areas = [
    {
      id: "ham",
      icon: "fa-laptop",
      title: gs.getMessage("Hardware Asset Management"),
      summary: gs.getMessage(
        "Processes, tools and strategies for managing the physical components of computers and related systems, using ServiceNow best practices for hardware asset data and its life cycle."
      ),
      includes: [
        gs.getMessage("End user computers"),
        gs.getMessage("Servers"),
        gs.getMessage("Network infrastructure"),
        gs.getMessage("Medical devices"),
      ],
    },
    {
      id: "sam",
      icon: "fa-file-code-o",
      title: gs.getMessage("Software Asset Management"),
      summary: gs.getMessage(
        "Tracks, evaluates and manages software licenses, compliance and optimization, using ServiceNow best practices for software asset data and licenses."
      ),
      includes: [
        gs.getMessage("Software on in-scope hardware"),
        gs.getMessage("Prioritized SaaS products"),
      ],
    },
    {
      id: "service_mapping",
      icon: "fa-sitemap",
      title: gs.getMessage("Service Mapping"),
      summary: gs.getMessage(
        "Maps the configuration items (CIs) behind critical IT services, enabling improved change controls, faster incident response and proactive service outage assessments."
      ),
      includes: [
        gs.getMessage("Critical IT services"),
        gs.getMessage("Configuration items"),
      ],
    },
  ];

  data.objectives = [
    {
      id: "lifecycle",
      icon: "fa-refresh",
      title: gs.getMessage("Full Lifecycle Inventory"),
      summary: gs.getMessage(
        "Hardware and software assets are tracked from procurement to maintenance to disposal or retirement, keeping assets in optimal condition and improving customer service and support."
      ),
    },
    {
      id: "financial",
      icon: "fa-line-chart",
      title: gs.getMessage("Smarter Financial Planning"),
      summary: gs.getMessage(
        "A clear map of what needs replacing, and when, helps avoid overspending, underspending and unexpected budget needs. Planned asset reports will inform technology refreshes and annual budgets."
      ),
    },
    {
      id: "security",
      icon: "fa-shield",
      title: gs.getMessage("Security and Risk"),
      summary: gs.getMessage(
        "Up-to-date, monitored assets close the gaps left by outdated equipment and expired licenses. Real-time analytics will track asset health and performance to meet security and compliance requirements."
      ),
    },
  ];
})();
