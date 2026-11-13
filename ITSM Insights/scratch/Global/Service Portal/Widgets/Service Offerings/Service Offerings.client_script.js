api.controller = function ($rootScope, $scope) {
    /* widget controller */
    var c = this;

    var LOCATION_EVENT = 'siteStatusHeader.location';
    var LOCATION_REQUEST_EVENT = 'siteStatusHeader.requestLocation';

    c.loading = true;
    c.locationId = null;
    c.noLocation = false;
    c.placeholders = [1, 2, 3, 4, 5, 6, 7, 8];

    function loadOfferings(event, location) {
        var locationId = (location && location.sys_id) || '';
        if (!location || locationId === c.locationId) return;
        c.locationId = locationId;
        // The Site Status Header sends an empty location when none is selected and the page has no default
        c.noLocation = !locationId;
        if (c.noLocation) {
            c.data.offerings = [];
            c.data.locationFound = true;
            c.data.loadFailed = false;
            c.loading = false;
            return;
        }
        c.loading = true;
        c.server
            .get({ action: 'getOfferings', locationId: locationId })
            .then(function (response) {
                // A newer selection was made while this request was running
                if (locationId !== c.locationId) return;
                c.data.offerings = response.data.offerings;
                c.data.locationFound = response.data.locationFound;
            })
            .finally(function () {
                if (locationId === c.locationId) c.loading = false;
            });
    }

    var unbindLocation = $rootScope.$on(LOCATION_EVENT, loadOfferings);
    $scope.$on('$destroy', unbindLocation);

    // Covers the case where the header broadcast before this widget was listening
    $rootScope.$broadcast(LOCATION_REQUEST_EVENT);
};
