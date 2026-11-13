(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    contactHeading: gs.getMessage("Contact the Program Team"),
    contactIntro: options.contact_intro
      ? gs.getMessage(options.contact_intro)
      : gs.getMessage(
          "Questions about the ITAM program, or think your team should be involved? Get in touch."
        ),
    emailLabel: gs.getMessage("Email the program team"),
    getHelp: gs.getMessage("Ways to get help"),
    exploreHeading: gs.getMessage("Explore the Program"),
    resourcesHeading: gs.getMessage("Quick Links"),
    footerLabel: gs.getMessage("ITAM Program portal footer"),
  };

  data.email = "";
  try {
    data.email = new ITAMPortalUtil().getSetting("contact_email");
  } catch (e) {
    gs.error("ITAM Portal Footer: " + e);
  }

  data.explore = [
    { id: "home", label: gs.getMessage("Home"), page: "itam_home" },
    { id: "program", label: gs.getMessage("Program and roadmap"), page: "itam_roadmap" },
    { id: "governance", label: gs.getMessage("Governance"), page: "itam_governance" },
    { id: "stakeholders", label: gs.getMessage("Stakeholders and outreach"), page: "itam_stakeholders" },
  ];
  data.links = [
    { id: "training", label: gs.getMessage("Training and documentation"), url: "?id=itam_learning&tab=training" },
    { id: "faqs", label: gs.getMessage("FAQs"), url: "?id=itam_learning&tab=faqs" },
    { id: "glossary", label: gs.getMessage("Glossary"), url: "?id=itam_learning&tab=glossary" },
    { id: "policy", label: gs.getMessage("IT Asset Management Policy"), url: "?id=itam_policy" },
    { id: "issues", label: gs.getMessage("Known issues"), url: "?id=itam_help" },
  ];
})();
