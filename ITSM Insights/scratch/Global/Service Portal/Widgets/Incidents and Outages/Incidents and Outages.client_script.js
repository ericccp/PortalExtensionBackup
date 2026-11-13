api.controller = function ($rootScope, $scope) {
    /* widget controller */
    var c = this;

    var LOCATION_EVENT = 'siteStatusHeader.location';
    var LOCATION_REQUEST_EVENT = 'siteStatusHeader.requestLocation';

    c.loading = true;
    c.locationId = null;
    c.noLocation = false;
    c.page = 0;

    c.pageCount = function () {
        return Math.ceil((c.data.items || []).length / c.data.pageSize);
    };

    c.goToPage = function (page) {
        c.page = Math.max(0, Math.min(page, c.pageCount() - 1));
    };

    c.pageLabel = function () {
        return c.data.messages.page.replace('{0}', c.page + 1).replace('{1}', c.pageCount());
    };

    function loadIncidents(event, location) {
        var locationId = (location && location.sys_id) || '';
        if (!location || locationId === c.locationId) return;
        c.locationId = locationId;
        // The Site Status Header sends an empty location when none is selected and the page has no default
        c.noLocation = !locationId;
        if (c.noLocation) {
            c.data.items = [];
            c.data.locationFound = true;
            c.data.loadFailed = false;
            c.loading = false;
            return;
        }
        c.loading = true;
        c.server
            .get({ action: 'getIncidents', locationId: locationId })
            .then(function (response) {
                // A newer selection was made while this request was running
                if (locationId !== c.locationId) return;
                c.data.items = response.data.items || [];
                c.data.locationFound = response.data.locationFound !== false;
                c.data.loadFailed = !!response.data.loadFailed;
                c.page = 0;
            }, function () {
                if (locationId !== c.locationId) return;
                c.data.items = [];
                c.data.loadFailed = true;
            })
            .finally(function () {
                if (locationId === c.locationId) c.loading = false;
            });
    }

    var unbindLocation = $rootScope.$on(LOCATION_EVENT, loadIncidents);
    $scope.$on('$destroy', unbindLocation);

    // Covers the case where the header broadcast before this widget was listening
    $rootScope.$broadcast(LOCATION_REQUEST_EVENT);
};
