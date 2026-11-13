api.controller = function ($rootScope, $scope, $timeout) {
  /*
   * Events being $broadcast:
   *   itamProgramHero.search - on $rootScope, sends the trimmed search term. Receiving Widgets: ITAM Roadmap Board, ITAM Roadmap Timeline.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   itamProgramHero.requestSearch - on $rootScope, re-sends the current term for widgets that loaded late. Emitting Widgets: ITAM Roadmap Board, ITAM Roadmap Timeline.
   *   itamRoadmap.clearSearch - on $rootScope, empties the search box and re-sends the empty term. Emitting Widgets: ITAM Roadmap Board, ITAM Roadmap Timeline.
   *   $destroy - unregisters root-scope listeners and the pending debounce. Source: AngularJS scope lifecycle.
   */
  var SEARCH_EVENT = "itamProgramHero.search";
  var SEARCH_REQUEST_EVENT = "itamProgramHero.requestSearch";
  var CLEAR_SEARCH_EVENT = "itamRoadmap.clearSearch";

  var c = this;
  c.term = "";
  var pending = null;

  function send() {
    $rootScope.$broadcast(SEARCH_EVENT, (c.term || "").trim());
  }

  c.onSearchChange = function () {
    if (pending) {
      $timeout.cancel(pending);
    }
    pending = $timeout(send, 200);
  };

  c.clearSearch = function () {
    c.term = "";
    send();
  };

  var unbindRequest = $rootScope.$on(SEARCH_REQUEST_EVENT, send);
  var unbindClear = $rootScope.$on(CLEAR_SEARCH_EVENT, c.clearSearch);
  $scope.$on("$destroy", function () {
    unbindRequest();
    unbindClear();
    if (pending) {
      $timeout.cancel(pending);
    }
  });
};
