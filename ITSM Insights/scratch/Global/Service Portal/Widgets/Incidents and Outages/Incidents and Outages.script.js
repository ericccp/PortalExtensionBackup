(function () {
    // "Major Incident" badges come from priority (P1/P2, SiteStatusUtility.HIGH_PRIORITIES), not the incident's
    // major_incident_state; switch SiteStatusUtility._incidentOutageItem to that field if Major Incident Management is adopted
    // Incidents and outages load on demand once the Site Status Header broadcasts its location
    data.items = [];
    data.locationFound = true;
    data.loadFailed = false;
    data.recordPage = options.record_page || 'form';
    data.viewAllUrl = options.view_all_url || '';
    data.pageSize = parseInt(options.page_size, 10) > 0 ? parseInt(options.page_size, 10) : 3;

    // Display text lives here so titles and messages can be updated in one place
    data.messages = {
        heading: gs.getMessage('Outages & Active Incidents'),
        subHeading: gs.getMessage('Current service disruptions at this location and their progress toward resolution.'),
        viewAll: gs.getMessage('View all'),
        loadFailed: gs.getMessage("Incidents couldn't be loaded. Try again later."),
        chooseLocation: gs.getMessage('Choose a location to see its site status.'),
        locationNotFound: gs.getMessage('Location not found.'),
        empty: gs.getMessage('No outages or active incidents at this site.'),
        affects: gs.getMessage('Affects'),
        majorIncident: gs.getMessage('Major Incident'),
        slaLabel: gs.getMessage('Resolution SLA'),
        assigned: gs.getMessage('Assigned:'),
        pagerLabel: gs.getMessage('Incidents and outages pages'),
        previous: gs.getMessage('Previous'),
        next: gs.getMessage('Next'),
        // Placeholders are filled in on the client as the page changes
        page: gs.getMessage('Page {0} of {1}')
    };

    if (input && input.action === 'getIncidents') {
        // A failed lookup is reported as such instead of looking like an unknown location
        try {
            var items = new SiteStatusUtility().getIncidentsAndOutages(input.locationId, {
                includeChildLocations: String(options.include_child_locations) !== 'false',
                filter: options.filter,
                limit: parseInt(options.max_items, 10) > 0 ? parseInt(options.max_items, 10) : 10
            });
            // null means the location was not found; an empty list can be falsy here, so compare explicitly
            data.locationFound = items !== null;
            data.items = items === null ? [] : items;
        } catch (e) {
            gs.error('Incidents and Outages widget: could not load incidents for location {0}: {1}', input.locationId, e);
            data.loadFailed = true;
        }
    }
})();
