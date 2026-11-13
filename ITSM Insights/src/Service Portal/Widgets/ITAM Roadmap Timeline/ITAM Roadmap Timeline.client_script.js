api.controller = function ($rootScope, $scope) {
  /*
   * Events being $broadcast:
   *   itamProgramHero.requestSearch - on $rootScope, asks the hero to re-send its term in case it loaded first. Receiving Widget: ITAM Program Hero.
   *   itamRoadmap.clearSearch - on $rootScope, asks the hero to clear its search box. Receiving Widget: ITAM Program Hero.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   itamProgramHero.search - on $rootScope, filters projects by the search term. Emitting Widget: ITAM Program Hero.
   *   $destroy - unregisters root-scope listeners. Source: AngularJS scope lifecycle.
   */
  var SEARCH_EVENT = "itamProgramHero.search";
  var SEARCH_REQUEST_EVENT = "itamProgramHero.requestSearch";
  var CLEAR_SEARCH_EVENT = "itamRoadmap.clearSearch";

  var c = this;
  c.term = "";
  c.workstream = "all";
  c.showAll = {};
  c.visibleTotal = 0;
  c.resultMessage = "";

  function format(template, value) {
    return String(template).replace("{0}", value);
  }

  function matches(item, term) {
    if (c.workstream !== "all" && item.workstream !== c.workstream) {
      return false;
    }
    if (!term) {
      return true;
    }
    var haystack = [
      item.name,
      item.shortDescription,
      item.description,
      item.workstreamLabel,
      item.phase,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(term) > -1;
  }

  c.applyFilters = function () {
    var term = (c.term || "").toLowerCase();
    var total = 0;
    angular.forEach(c.data.groups, function (group) {
      group.visible = group.items.filter(function (item) {
        return matches(item, term);
      });
      total += group.visible.length;
    });
    c.visibleTotal = total;
    c.resultMessage =
      total === 1
        ? c.data.text.resultsOne
        : format(c.data.text.resultsMany, total);
  };

  c.setWorkstream = function (value) {
    c.workstream = value;
    c.applyFilters();
  };

  c.clearAll = function () {
    c.workstream = "all";
    c.term = "";
    c.applyFilters();
    $rootScope.$broadcast(CLEAR_SEARCH_EVENT);
  };

  c.toggleShowAll = function (group) {
    c.showAll[group.value] = !c.showAll[group.value];
  };

  c.limitFor = function (group) {
    if (!c.data.collapseAfter || c.showAll[group.value]) {
      return group.visible.length;
    }
    return c.data.collapseAfter;
  };

  c.showAllLabel = function (group) {
    return format(c.data.text.showAll, group.visible.length);
  };

  c.countLabel = function (group) {
    return format(c.data.text.countLabel, group.visible.length);
  };

  var unbindSearch = $rootScope.$on(SEARCH_EVENT, function (event, term) {
    c.term = term || "";
    c.applyFilters();
  });
  $scope.$on("$destroy", unbindSearch);

  c.applyFilters();
  // Covers the case where the hero broadcast before this widget was listening
  $rootScope.$broadcast(SEARCH_REQUEST_EVENT);
};
