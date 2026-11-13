api.controller = function ($rootScope, $scope, $location, $timeout) {
  /*
   * Events being $broadcast:
   *   None.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   itamProgramHero.search - on $rootScope, switches to the tab marked for search when a term arrives. Emitting Widget: ITAM Program Hero.
   *   $locationChangeSuccess - on $rootScope, follows back/forward between tabs. Source: AngularJS $location.
   *   $destroy - unregisters root-scope listeners. Source: AngularJS scope lifecycle.
   */
  var SEARCH_EVENT = "itamProgramHero.search";

  var c = this;
  c.active = c.data.activeTab;
  // Panels render on first visit, then stay mounted so filters and scroll state survive tab switches
  c.visited = {};
  c.visited[c.active] = true;

  function findTab(id) {
    for (var i = 0; i < c.data.tabs.length; i++) {
      if (c.data.tabs[i].id === id) {
        return c.data.tabs[i];
      }
    }
    return null;
  }

  function show(id) {
    if (!findTab(id)) {
      return;
    }
    c.active = id;
    c.visited[id] = true;
  }

  c.select = function (tab) {
    if (tab.id === c.active) {
      return;
    }
    show(tab.id);
    // Keep the tab in the URL so it can be shared and Back works
    $location.search("tab", tab.id);
  };

  c.tabDomId = function (tab) {
    return "itam-tab-" + $scope.$id + "-" + tab.id;
  };

  c.panelDomId = function (tab) {
    return "itam-tabpanel-" + $scope.$id + "-" + tab.id;
  };

  // Arrow keys move between tabs (WAI-ARIA tabs pattern with automatic activation)
  c.onKeydown = function (event, index) {
    var count = c.data.tabs.length;
    var next = null;
    if (event.keyCode === 39) next = (index + 1) % count;
    else if (event.keyCode === 37) next = (index - 1 + count) % count;
    else if (event.keyCode === 36) next = 0;
    else if (event.keyCode === 35) next = count - 1;
    if (next === null) {
      return;
    }
    event.preventDefault();
    var tab = c.data.tabs[next];
    c.select(tab);
    $timeout(function () {
      var el = document.getElementById(c.tabDomId(tab));
      if (el) {
        el.focus();
      }
    });
  };

  var unbindLocation = $rootScope.$on("$locationChangeSuccess", function () {
    var id = $location.search().tab;
    show(id && findTab(id) ? id : c.data.tabs.length ? c.data.tabs[0].id : "");
  });

  var unbindSearch = $rootScope.$on(SEARCH_EVENT, function (event, term) {
    if (!term) {
      return;
    }
    for (var i = 0; i < c.data.tabs.length; i++) {
      if (c.data.tabs[i].search) {
        c.select(c.data.tabs[i]);
        return;
      }
    }
  });

  $scope.$on("$destroy", function () {
    unbindLocation();
    unbindSearch();
  });
};
