(function () {
  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading ? gs.getMessage(options.heading) : gs.getMessage("Document Library"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage("Every ITAM policy, standard, guideline and procedure in one place."),
    searchLabel: gs.getMessage("Search documents"),
    searchPlaceholder: gs.getMessage("Search by title, summary or owner"),
    clearSearch: gs.getMessage("Clear search"),
    typeFilterLabel: gs.getMessage("Filter by document type"),
    allTypes: gs.getMessage("All"),
    tableLabel: gs.getMessage("ITAM documents"),
    tableCaption: gs.getMessage("ITAM documents. Select a column header to sort, or a document title to show its details."),
    colTitle: gs.getMessage("Document"),
    colType: gs.getMessage("Type"),
    colOwner: gs.getMessage("Owner"),
    colVersion: gs.getMessage("Version"),
    colApproved: gs.getMessage("Approved"),
    colReview: gs.getMessage("Next review"),
    sortBy: gs.getMessage("Sort by"),
    defaultOrder: gs.getMessage("Document type"),
    ascending: gs.getMessage("Ascending"),
    descending: gs.getMessage("Descending"),
    showDetails: gs.getMessage("Show details"),
    hideDetails: gs.getMessage("Hide details"),
    summary: gs.getMessage("Summary"),
    keyPoints: gs.getMessage("Key points"),
    noSummary: gs.getMessage("No summary has been added yet."),
    reviewDue: gs.getMessage("Review due"),
    notSet: gs.getMessage("Not set"),
    read: gs.getMessage("Read the full document"),
    comingSoon: gs.getMessage("Full document coming soon"),
    opensNewWindow: gs.getMessage("opens in a new window"),
    resultCount: gs.getMessage("Showing {0} of {1} documents"),
    noDocs: gs.getMessage("Policy and standards documents will be published here."),
    noMatches: gs.getMessage("No documents match your search."),
    clearFilters: gs.getMessage("Clear search and filters"),
    loadError: gs.getMessage("Documents could not be loaded. Please try again later."),
  };

  data.loadError = false;
  data.docs = [];
  data.types = [];
  try {
    data.docs = new ITAMPortalUtil().getDocuments(options.types || "");
  } catch (e) {
    gs.error("ITAM Document Library: " + e);
    data.loadError = true;
  }

  // Flag documents whose next review date has passed (yyyy-MM-dd compares as text)
  var today = new GlideDate().getValue();
  var seen = {};
  for (var i = 0; i < data.docs.length; i++) {
    var doc = data.docs[i];
    doc.reviewOverdue = !!doc.nextReviewValue && doc.nextReviewValue < today;
    // Type filter chips, in the document type order, only for types that have documents
    if (!seen[doc.type]) {
      seen[doc.type] = true;
      data.types.push({ value: doc.type, label: doc.typeLabel, icon: doc.icon });
    }
  }
})();
