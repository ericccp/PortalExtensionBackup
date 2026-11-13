api.controller = function($scope) {
    /*
     * Events being $broadcast:
     *   None.
     *
     * Events being $emit:
     *   ecAssetNotification.visibilityChanged - sends whether notifications exist on initialization and whenever their count changes. Receiving Widget: Device Detail.
     *
     * Events being spied $on:
     *   None.
     */
    var c = this;

    // Let the embedding widget hide its layout wrapper when the list is empty.
    $scope.$watch(function() {
        var details = c.data.deviceDetails;
        return details && details.notifications ? details.notifications.length : 0;
    }, function(count) {
        $scope.$emit('ecAssetNotification.visibilityChanged', count > 0);
    });

    c.dismissNotification = function(notification, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!notification || !c.data.deviceDetails || !c.data.deviceDetails.notifications) {
            return;
        }

        c.data.deviceDetails.notifications = c.data.deviceDetails.notifications.filter(function(item) {
            return item.id !== notification.id;
        });
    };
};
