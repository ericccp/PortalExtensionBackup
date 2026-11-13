(function () {
    // Problems load on demand once the Site Status Header broadcasts its location
    data.problems = [];
    data.locationFound = true;
    data.kbPage = options.kb_page || 'kb_article';
    data.problemPage = options.problem_page || 'form';
    data.viewAllUrl = options.view_all_url || '';
    data.pageSize = parseInt(options.page_size, 10) > 0 ? parseInt(options.page_size, 10) : 3;

    // Display text lives here so titles and messages can be updated in one place
    data.messages = {
        heading: gs.getMessage('Known Problems & Workarounds'),
        subHeading: gs.getMessage('Known issues at this location and how to work around them.'),
        viewAll: gs.getMessage('View all'),
        chooseLocation: gs.getMessage('Choose a location to see its site status.'),
        locationNotFound: gs.getMessage('Location not found.'),
        empty: gs.getMessage('No known problems at this site.'),
        affects: gs.getMessage('Affects'),
        workaround: gs.getMessage('Workaround:'),
        noWorkaround: gs.getMessage('No workaround yet.'),
        pagerLabel: gs.getMessage('Known problems pages'),
        previous: gs.getMessage('Previous'),
        next: gs.getMessage('Next'),
        // Placeholders are filled in on the client as the page changes
        page: gs.getMessage('Page {0} of {1}')
    };

    if (input && input.action === 'getProblems') {
        var problems = new SiteStatusUtility().getKnownProblems(input.locationId, {
            includeChildLocations:
                String(options.include_child_locations) !== 'false',
            filter: options.filter,
            limit:
                parseInt(options.max_problems, 10) > 0
                    ? parseInt(options.max_problems, 10)
                    : 10
        });
        // null means the location was not found; an empty list can be falsy here, so compare explicitly
        data.locationFound = problems !== null;
        data.problems = problems === null ? [] : problems;
    }
})();
