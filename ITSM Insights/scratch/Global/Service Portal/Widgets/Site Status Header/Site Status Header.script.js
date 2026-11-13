(function () {
    var siteStatus = new SiteStatusUtility();

    // Heading falls back to the current page title when no option is set
    data.heading = options.heading
        ? gs.getMessage(options.heading)
        : getPageTitle();
    data.subHeading = options.sub_heading
        ? gs.getMessage(options.sub_heading)
        : '';

    // The Location option is the default site; locations saved in the selector take its place
    data.defaultLocation = getLocation(options.location);
    data.location = data.defaultLocation;
    data.showLocationSelector = String(options.show_location_selector) !== 'false';
    data.locationsSavedEvent = 'siteStatusHeader.locationsSaved';

    if (data.showLocationSelector) {
        data.location = getSavedLocations(gs.getUser().getPreference(siteStatus.LOCATION_PREF)) || data.defaultLocation;
        data.locationSelector = $sp.getWidget(
            gs.getProperty('location_preference_selector.widget', 'cfc747119384df18600674418bba107f'),
            {
                preference_name: siteStatus.LOCATION_PREF,
                event_name: data.locationsSavedEvent,
                filter_label: gs.getMessage('Show site status for'),
                // Clearing the selection goes back to the default site, so the button names it
                empty_label: data.defaultLocation ? data.defaultLocation.name : gs.getMessage('Select locations')
            }
        );
    }

    function getPageTitle() {
        var pageGR = new GlideRecord('sp_page');
        if (pageGR.get('id', $sp.getParameter('id')))
            return pageGR.getDisplayValue('title');
        return '';
    }

    function getLocation(locationId) {
        if (!locationId) return null;
        var locationGR = new GlideRecordSecure('cmn_location');
        if (!locationGR.get(locationId)) return null;
        return {
            sys_id: locationGR.getUniqueValue(),
            name: locationGR.getDisplayValue('name')
        };
    }

    // Same shape as getLocation, with comma-separated sys_ids and names; null when none are readable
    function getSavedLocations(ids) {
        ids = String(ids || '').split(',').filter(function (id) {
            return /^[0-9a-f]{32}$/.test(id);
        });
        if (!ids.length) return null;

        var values = [];
        var names = [];
        var locationGR = new GlideRecordSecure('cmn_location');
        locationGR.addQuery('sys_id', 'IN', ids.join(','));
        locationGR.orderBy('name');
        locationGR.query();
        while (locationGR.next()) {
            values.push(locationGR.getUniqueValue());
            names.push(locationGR.getDisplayValue('name'));
        }
        return values.length ? { sys_id: values.join(','), name: names.join(', ') } : null;
    }
})();
