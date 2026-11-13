(function () {
    // Windows load on demand once the Site Status Header broadcasts its location
    data.windows = [];
    data.locationFound = true;
    data.recordPage = options.record_page || 'form';
    data.viewAllUrl = options.view_all_url || '';
    data.varianceUrl = options.variance_url || '';
    data.pageSize = parseInt(options.page_size, 10) > 0 ? parseInt(options.page_size, 10) : 3;

    var days = parseInt(options.days, 10) > 0 ? parseInt(options.days, 10) : 7;

    // Display text lives here so titles and messages can be updated in one place
    data.messages = {
        heading: gs.getMessage('Scheduled Maintenance'),
        subHeading: gs.getMessage('Scheduled maintenance that may interrupt services at this location.'),
        viewAll: gs.getMessage('View all'),
        chooseLocation: gs.getMessage('Choose a location to see its site status.'),
        locationNotFound: gs.getMessage('Location not found.'),
        empty: days === 1
            ? gs.getMessage('No maintenance scheduled in the next day.')
            : gs.getMessage('No maintenance scheduled in the next {0} days.', [String(days)]),
        inProgress: gs.getMessage('In progress'),
        addToCalendar: gs.getMessage('Add to my calendar'),
        requestVariance: gs.getMessage('Request variance'),
        pagerLabel: gs.getMessage('Maintenance window pages'),
        previous: gs.getMessage('Previous'),
        next: gs.getMessage('Next'),
        // Placeholders are filled in on the client as the page changes
        page: gs.getMessage('Page {0} of {1}')
    };

    if (input && input.action === 'getWindows') {
        var windows = new SiteStatusUtility().getMaintenanceWindows(input.locationId, {
            includeChildLocations: String(options.include_child_locations) !== 'false',
            days: days,
            limit: parseInt(options.max_windows, 10) > 0 ? parseInt(options.max_windows, 10) : 10,
            impactField: options.impact_field
        });
        // null means the location was not found; an empty list can be falsy here, so compare explicitly
        data.locationFound = windows !== null;
        data.windows = windows === null ? [] : windows;
    }
})();
