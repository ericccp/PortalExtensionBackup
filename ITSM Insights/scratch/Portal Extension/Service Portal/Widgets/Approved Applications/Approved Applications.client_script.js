api.controller = function() {
  var c = this;
  var applications = c.data.applications || [];
  var text = c.data.text;
  c.query = '';
  c.sortKey = 'name';
  c.descending = false;
  c.columns = [
    {key: 'name', label: 'Application'},
    {key: 'vendor', label: 'Vendor'},
    {key: 'category', label: 'Category'},
    {key: 'status', label: 'Status'},
    {key: 'licensable', label: 'Licensable'},
    {key: 'platforms', label: 'Platforms'},
    {key: 'requestProcess', label: 'How to get access'}
  ];
  // Checkbox dropdown filters, styled after EC Asset Filters. Options are built
  // from the distinct values in the catalog. c.filters holds applied values;
  // c.draft holds checkbox state while a dropdown is open, until Apply.
  c.filterFields = c.data.showFilters ? [
    {key: 'vendor', label: text.filterVendor},
    {key: 'category', label: text.filterCategory},
    {key: 'status', label: text.filterStatus},
    {key: 'licensable', label: text.filterLicensable}
  ] : [];
  c.filters = {};
  c.draft = {};
  c.filterOptions = {};
  c.filterPills = [];
  c.openFilter = null;
  c.returnFocusTo = null;
  c.total = applications.length;
  c.pageSize = Math.floor(Number(c.data.pageSize));
  if (!isFinite(c.pageSize) || c.pageSize < 1) c.pageSize = 5;
  c.currentPage = 1;

  c.setPage = function(page) {
    c.pageCount = Math.ceil(c.results.length / c.pageSize);
    c.currentPage = Math.max(1, Math.min(page, c.pageCount || 1));
    var start = (c.currentPage - 1) * c.pageSize;
    c.pageResults = c.results.slice(start, start + c.pageSize);
    c.firstResult = c.results.length ? start + 1 : 0;
    c.lastResult = start + c.pageResults.length;
  };

  function normalize(value) {
    return String(value === null || value === undefined ? '' : value).toLowerCase();
  }

  c.licensableLabel = function(value) {
    if (value === true) return text.licensableYes;
    if (value === false) return text.licensableNo;
    return text.licensableUnspecified;
  };

  // Stable string key for each filterable field, so booleans and text filter alike.
  function filterValue(app, key) {
    if (key === 'licensable') {
      return app.licensable === true ? 'yes' : (app.licensable === false ? 'no' : 'unspecified');
    }
    return String(app[key] || '');
  }

  function buildFilterOptions(key) {
    var seen = {};
    var options = [];
    applications.forEach(function(app) {
      var value = filterValue(app, key);
      if (!value || seen[value]) return;
      seen[value] = true;
      options.push({value: value, label: key === 'licensable' ? c.licensableLabel(app.licensable) : value});
    });
    if (key === 'licensable') {
      var order = ['yes', 'no', 'unspecified'];
      return options.sort(function(a, b) { return order.indexOf(a.value) - order.indexOf(b.value); });
    }
    return options.sort(function(a, b) { return normalize(a.label).localeCompare(normalize(b.label)); });
  }

  c.filterFields.forEach(function(field) {
    c.filters[field.key] = [];
    c.draft[field.key] = {};
    c.filterOptions[field.key] = buildFilterOptions(field.key);
  });

  function optionLabel(key, value) {
    var match = c.filterOptions[key].filter(function(option) { return option.value === value; })[0];
    return match ? match.label : value;
  }

  function buildFilterPills() {
    c.filterPills = [];
    c.filterFields.forEach(function(field) {
      c.filters[field.key].forEach(function(value) {
        var label = field.label + ': ' + optionLabel(field.key, value);
        c.filterPills.push({key: field.key, value: value, label: label, clearLabel: text.removeFilter + ' ' + label});
      });
    });
  }

  c.hasActiveFilters = function() {
    return !!c.query || c.filterPills.length > 0;
  };

  c.toggleFilter = function(key) {
    if (c.openFilter === key) {
      c.openFilter = null;
      return;
    }
    // Seed the checkboxes from the applied values each time the menu opens.
    c.draft[key] = {};
    c.filters[key].forEach(function(value) { c.draft[key][value] = true; });
    c.openFilter = key;
  };

  c.closeFilter = function() {
    c.openFilter = null;
  };

  c.draftCount = function(key) {
    return c.filterOptions[key].filter(function(option) { return !!c.draft[key][option.value]; }).length;
  };

  // Apply is enabled only when the checkboxes differ from the applied filter.
  c.draftChanged = function(key) {
    var applied = c.filters[key];
    return c.filterOptions[key].some(function(option) {
      return !!c.draft[key][option.value] !== (applied.indexOf(option.value) !== -1);
    });
  };

  // Long option lists scroll inside the menu and get the footer separator.
  c.isScrollable = function(key) {
    return c.filterOptions[key].length > 9;
  };

  // Escape: close the menu without applying and put focus back on its toggle.
  c.clearFilterFocus = function(key) {
    c.returnFocusTo = key;
    c.openFilter = null;
  };

  c.applyFilter = function(key) {
    c.filters[key] = c.filterOptions[key].map(function(option) { return option.value; })
      .filter(function(value) { return !!c.draft[key][value]; });
    c.returnFocusTo = key;
    c.openFilter = null;
    c.updateResults();
  };

  c.clearFilter = function(key) {
    c.filters[key] = [];
    c.draft[key] = {};
    c.returnFocusTo = key;
    c.openFilter = null;
    c.updateResults();
  };

  c.clearPill = function(pill) {
    c.filters[pill.key] = c.filters[pill.key].filter(function(value) { return value !== pill.value; });
    c.updateResults();
  };

  c.clearAllFilters = function() {
    c.filterFields.forEach(function(field) { c.filters[field.key] = []; });
    c.updateResults();
  };

  c.resetSearch = function() {
    c.query = '';
    c.updateResults();
  };

  c.updateResults = function() {
    var terms = normalize(c.query).trim().split(/\s+/);
    c.results = applications.filter(function(app) {
      var matchesFilters = c.filterFields.every(function(field) {
        var selected = c.filters[field.key];
        return !selected.length || selected.indexOf(filterValue(app, field.key)) !== -1;
      });
      if (!matchesFilters) return false;
      var searchable = [app.name, app.vendor, app.purpose, app.category,
        app.status, c.licensableLabel(app.licensable), app.platforms,
        app.requestProcess].join(' ').toLowerCase();
      return terms.every(function(term) {
        return searchable.indexOf(term) !== -1;
      });
    }).sort(function(a, b) {
      var left = normalize(a[c.sortKey]);
      var right = normalize(b[c.sortKey]);
      var result = left.localeCompare(right);
      // Keep applications in alphabetical order when the selected values tie.
      return result ? (c.descending ? -result : result) : normalize(a.name).localeCompare(normalize(b.name));
    });
    buildFilterPills();
    // Search, filter, and sort always start at the first page of the full result set.
    c.setPage(1);
  };

  c.sortBy = function(key) {
    c.descending = c.sortKey === key ? !c.descending : false;
    c.sortKey = key;
    c.updateResults();
  };

  c.clearFilters = function() {
    c.query = '';
    c.clearAllFilters();
  };

  c.updateResults();
};
