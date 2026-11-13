api.controller = function () {
  /*
   * Events being $broadcast:
   *   None.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   None.
   */
  var c = this;

  c.columns = [
    { key: "title", label: c.data.text.colTitle },
    { key: "type", label: c.data.text.colType },
    { key: "owner", label: c.data.text.colOwner },
    { key: "version", label: c.data.text.colVersion },
    { key: "approvedValue", label: c.data.text.colApproved },
    { key: "nextReviewValue", label: c.data.text.colReview },
  ];

  // Default order is the server's: by type, then order, then title
  c.sortKey = "";
  c.descending = false;
  c.search = "";
  c.type = "";
  c.open = {};
  c.results = [];

  angular.forEach(c.data.docs, function (doc, index) {
    doc.position = index;
    doc.rank = doc.rank || 0;
    doc.searchText = [doc.title, doc.summary, doc.owner, doc.typeLabel, doc.keyPoints.join(" ")].join(" ").toLowerCase();
  });

  function normalize(value) {
    return String(value === null || value === undefined ? "" : value).toLowerCase();
  }

  function compare(a, b) {
    if (!c.sortKey) {
      return a.position - b.position;
    }
    var result;
    if (c.sortKey === "type") {
      result = a.rank - b.rank;
    } else {
      var left = normalize(a[c.sortKey]);
      var right = normalize(b[c.sortKey]);
      // Documents without a value always sort last
      if (!left || !right) {
        result = left ? -1 : right ? 1 : 0;
        return result || a.position - b.position;
      }
      result = left.localeCompare(right);
    }
    if (c.descending) {
      result = -result;
    }
    return result || a.position - b.position;
  }

  c.updateResults = function () {
    var terms = normalize(c.search).split(/\s+/);
    c.results = c.data.docs.filter(function (doc) {
      if (c.type && doc.type !== c.type) {
        return false;
      }
      for (var i = 0; i < terms.length; i++) {
        if (terms[i] && doc.searchText.indexOf(terms[i]) === -1) {
          return false;
        }
      }
      return true;
    });
    c.results.sort(compare);
    c.countText = c.data.text.resultCount.replace("{0}", c.results.length).replace("{1}", c.data.docs.length);
  };

  c.sortBy = function (key) {
    c.descending = c.sortKey === key ? !c.descending : false;
    c.sortKey = key;
    c.updateResults();
  };

  c.ariaSort = function (key) {
    if (c.sortKey !== key) {
      return "none";
    }
    return c.descending ? "descending" : "ascending";
  };

  c.setType = function (type) {
    c.type = type;
    c.updateResults();
  };

  c.clearSearch = function () {
    c.search = "";
    c.updateResults();
  };

  c.hasActiveFilters = function () {
    return !!(c.search || c.type);
  };

  c.clearFilters = function () {
    c.search = "";
    c.type = "";
    c.updateResults();
  };

  c.toggle = function (doc) {
    c.open[doc.id] = !c.open[doc.id];
  };

  c.updateResults();
};
