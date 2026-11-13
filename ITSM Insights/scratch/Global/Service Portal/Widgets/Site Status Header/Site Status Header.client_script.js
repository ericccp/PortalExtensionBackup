api.controller = function ($rootScope, $scope, $timeout) {
    /*
     * Events being $broadcast:
     *   siteStatusHeader.location - on $rootScope, sends { sys_id, name }, where sys_id can be a comma-separated
     *     list of cmn_location sys_ids, or empty when none is selected and there is no default. Receiving Widgets: Site Status Cards, Service Offerings, Incidents and
     *     Outages, Upcoming Changes, Maintenance Windows, Known Problems, Monitored Assets, Service Contracts.
     *
     * Events being $emit:
     *   None.
     *
     * Events being spied $on:
     *   siteStatusHeader.requestLocation - on $rootScope, re-sends the location. Emitting Widgets: the receivers above.
     *   siteStatusHeader.locationsSaved - new selection, or empty to go back to the default location.
     *     Emitting Widget: Location Preference Selector (embedded).
     *   $destroy - unregisters root-scope listeners. Source: AngularJS scope lifecycle.
     */
    var c = this;

    var LOCATION_EVENT = 'siteStatusHeader.location';
    var LOCATION_REQUEST_EVENT = 'siteStatusHeader.requestLocation';

    // An empty sys_id tells the receivers to show their "choose a location" state
    function broadcastLocation() {
        $rootScope.$broadcast(LOCATION_EVENT, c.data.location || { sys_id: '', name: '' });
    }

    // Defer so sibling widgets have a chance to register listeners first
    $timeout(broadcastLocation);

    // Widgets that load after the initial broadcast can request it again
    var unbindRequest = $rootScope.$on(LOCATION_REQUEST_EVENT, broadcastLocation);
    $scope.$on('$destroy', unbindRequest);

    // The selector broadcasts on $rootScope, which reaches this scope too
    $scope.$on(c.data.locationsSavedEvent, function (event, ids, names) {
        c.data.location = ids
            ? { sys_id: ids, name: (names || '').split(',').join(', ') }
            : c.data.defaultLocation;
        broadcastLocation();
    });
};
