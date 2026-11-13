api.controller = function ($rootScope, spUtil, $scope, $document, $element) {
    /*
     * Events being $broadcast:
     *   Event Name option, default page-specific
     *   location_preference_selector.locations_changed -
     *     on $rootScope, sends saved comma-separated
     *     cmn_location sys_ids and their comma-separated names.
     *
     * Events being $emit:
     *   None.
     *
     * Events being spied $on:
     *   $destroy - removes the document click listener.
     */

    var c = this;

    c.showLocations = false;
    c.saving = false;

    // Optional encoded query configured through widget options.
    // Used by sn-record-picker to restrict selectable locations.
    // Example: active=true^country=US
    // Empty string means all locations.
    c.locationFilter = c.data.locationFilter || '';

    setSavedLocations(c.data.locations);

    c.locationCount = function () {
        return c.savedLocations.value
            ? c.savedLocations.value.split(',').length
            : 0;
    };

    c.toggleLocations = function () {
        if (c.showLocations) c.cancelLocations();
        else c.showLocations = true;
    };

    c.locationsDirty = function () {
        return c.locationField.value !== c.savedLocations.value;
    };

    c.saveLocations = function () {
        c.saving = true;

        c.server
            .get({
                action: 'saveLocations',
                locations: c.locationField.value,
                preferenceName: c.data.preferenceName
            })
            .then(
                function (response) {
                    if (!response.data.saved) {
                        spUtil.addErrorMessage(c.data.text.saveError);
                        return;
                    }

                    setSavedLocations(response.data.locations);
                    c.showLocations = false;

                    $rootScope.$broadcast(
                        c.data.locationsEvent,
                        c.savedLocations.value,
                        c.savedLocations.displayValue
                    );
                },
                function () {
                    spUtil.addErrorMessage(c.data.text.saveError);
                }
            )
            .finally(function () {
                c.saving = false;
            });
    };

    c.cancelLocations = function () {
        resetLocationField();
        c.showLocations = false;
    };

    c.clearLocations = function () {
        c.locationField.value = '';
        c.locationField.displayValue = '';
    };

    $document.on('click', onDocumentClick);

    $scope.$on('$destroy', function () {
        $document.off('click', onDocumentClick);
    });

    function onDocumentClick(event) {
        if (
            !c.showLocations ||
            $element[0].contains(event.target) ||
            isPickerDropdown(event.target)
        )
            return;

        $scope.$applyAsync(function () {
            if (c.showLocations) c.cancelLocations();
        });
    }

    function isPickerDropdown(target) {
        // Select2 appends the record picker's dropdown
        // outside the widget.
        var fields = $element[0].querySelectorAll('input, select');

        for (var i = 0; i < fields.length; i++) {
            var picker = angular.element(fields[i]).data('select2');
            var dropdown = picker && (picker.dropdown || picker.$dropdown);

            if (dropdown && dropdown[0] && dropdown[0].contains(target))
                return true;
        }

        return false;
    }

    function setSavedLocations(locations) {
        c.savedLocations = {
            value: (locations && locations.value) || '',
            displayValue: (locations && locations.displayValue) || ''
        };

        resetLocationField();
    }

    function resetLocationField() {
        c.locationField = {
            value: c.savedLocations.value,
            displayValue: c.savedLocations.displayValue,
            name: 'locations'
        };
    }
};
