api.controller = function($scope, $rootScope, $window) {
    /*
     * Events being $broadcast:
     *   None.
     *
     * Events being $emit:
     *   None.
     *
     * Events being spied $on:
     *   ec_asset_tabs.loading_complete - listens on $rootScope and clears the loading state. Emitting Widget: EC Asset Tabs.
     *   $destroy - unregisters the root-scope loading listener. Source: AngularJS scope lifecycle.
     */
    var c = this;
    c.isLoading = true;

    c.redirect = function(url) {
        $window.location.href = url;
    };
    
    // Listen for the loading complete event from EC request tabs
    var unregister = $rootScope.$on('ec_asset_tabs.loading_complete', function() {
        c.isLoading = false;
    });
    
    // Clean up the event listener when the scope is destroyed
    $scope.$on('$destroy', function() {
        unregister();
    });
    
};