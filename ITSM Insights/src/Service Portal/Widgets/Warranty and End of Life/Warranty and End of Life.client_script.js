api.controller = function ($rootScope, $scope) {
  /*
   * Events being $broadcast:
   *   siteStatusHeader.requestLocation - on $rootScope, requests a re-send of the current location on load. Receiving Widget: Site Status Header.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   siteStatusHeader.location - on $rootScope, loads warranty and lifecycle data scoped to the selected location(s). Emitting Widget: Site Status Header.
   *   $destroy - unregisters root-scope listeners. Source: AngularJS scope lifecycle.
   */
  var LOCATION_EVENT = "siteStatusHeader.location";
  var LOCATION_REQUEST_EVENT = "siteStatusHeader.requestLocation";

  var c = this;
  c.data = c.data || {};
  c.loading = true;
  c.locationId = null;

  function loadForLocation(event, selected) {
    var locationId = (selected && selected.sys_id) || "";
    if (!selected || locationId === c.locationId) {
      return;
    }
    c.locationId = locationId;
    c.loading = true;
    c.server
      .get({ action: "getData", locationId: locationId })
      .then(function (response) {
        // Ignore responses for a location the user has already moved away from
        if (locationId !== c.locationId) {
          return;
        }
        c.data = response.data;
      })
      .finally(function () {
        if (locationId === c.locationId) {
          c.loading = false;
        }
      });
  }

  var unbindLocation = $rootScope.$on(LOCATION_EVENT, loadForLocation);
  $scope.$on("$destroy", unbindLocation);

  // Covers the case where the header broadcast before this widget was listening
  $rootScope.$broadcast(LOCATION_REQUEST_EVENT);
};
