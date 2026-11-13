(function () {
    // Offerings load on demand once the Site Status Header broadcasts its location
    var siteStatus = new SiteStatusUtility();

    // Display text lives here so titles and messages can be updated in one place
    data.messages = {
        // The Heading option still overrides the default heading
        heading: options.heading
            ? gs.getMessage(options.heading)
            : gs.getMessage('Site Service Health'),
        subHeading: gs.getMessage('Current status of the services available at this location.'),
        legendLabel: gs.getMessage('Status legend'),
        chooseLocation: gs.getMessage('Choose a location to see its site status.'),
        locationNotFound: gs.getMessage('Location not found.'),
        empty: gs.getMessage('No service offerings found at this site.')
    };

    data.offeringPage = options.offering_page || 'my_service_status';
    data.showLegend = String(options.show_legend) !== 'false';
    data.statuses = siteStatus.getOfferingStatuses();
    data.offerings = [];
    data.locationFound = true;

    if (input && input.action === 'getOfferings') {
        var offerings = siteStatus.getServiceOfferings(input.locationId, {
            includeChildLocations: String(options.include_child_locations) !== 'false',
            filter: options.filter,
            limit: parseInt(options.max_offerings, 10) || 50,
            maintenanceDays: parseInt(options.maintenance_days, 10) || 7
        });
        // null means the location was not found; an empty list can be falsy here, so compare explicitly
        data.locationFound = offerings !== null;
        data.offerings = offerings === null ? [] : offerings;
    }
})();
