api.controller = function ($rootScope, $scope) {
  /*
   * Events being $broadcast:
   *   siteStatusHeader.requestLocation - on $rootScope, requests a re-send of the current location on load. Receiving Widget: Site Status Header.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   siteStatusHeader.location - on $rootScope, loads incident trend data scoped to the selected location(s). Emitting Widget: Site Status Header.
   *   $destroy - unregisters root-scope listeners. Source: AngularJS scope lifecycle.
   */
  var LOCATION_EVENT = "siteStatusHeader.location";
  var LOCATION_REQUEST_EVENT = "siteStatusHeader.requestLocation";

  var c = this;
  c.data = c.data || {};
  c.loading = true;
  c.locationId = null;

  // Server data may be cached, so stamp the "last updated" time in the browser
  function stampUpdatedTime() {
    c.data.footer = c.data.footer || {};
    c.data.footer.time = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function loadForLocation(event, location) {
    var locationId = (location && location.sys_id) || "";
    if (!location || locationId === c.locationId) {
      return;
    }
    c.locationId = locationId;
    c.loading = true;
    c.server
      .get({ action: "getData", locationId: locationId })
      .then(function (response) {
        if (locationId !== c.locationId) {
          return;
        }
        c.data = response.data;
        stampUpdatedTime();
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
