(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("Policy and Standards"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("The rules that govern IT assets at Ryder, and the standards that put them into practice."),
    typeLabel: gs.getMessage("Document type"),
    ownerLabel: gs.getMessage("Owner"),
    versionLabel: gs.getMessage("Version"),
    approvedLabel: gs.getMessage("Approved"),
    reviewLabel: gs.getMessage("Next review"),
    keyPoints: gs.getMessage("Key points"),
    showPoints: gs.getMessage("Show key points"),
    hidePoints: gs.getMessage("Hide key points"),
    read: gs.getMessage("Read the full document"),
    comingSoon: gs.getMessage("Full document coming soon"),
    opensNewWindow: gs.getMessage("opens in a new window"),
    viewAll: options.view_all_label ? gs.getMessage(options.view_all_label) : gs.getMessage("View all documents"),
    noDocs: gs.getMessage("Policy and standards documents will be published here."),
    loadError: gs.getMessage("Documents could not be loaded. Please try again later."),
  };

  // Optional header link to the full document library
  data.viewAllUrl = options.view_all_url ? String(options.view_all_url) : "";

  data.loadError = false;
  data.docs = [];
  try {
    data.docs = new ITAMPortalUtil().getDocuments(options.types || "");
  } catch (e) {
    gs.error("ITAM Document Cards: " + e);
    data.loadError = true;
  }
})();
