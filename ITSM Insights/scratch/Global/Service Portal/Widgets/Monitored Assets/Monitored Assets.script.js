(function () {
    // Assets load on demand once the Site Status Header broadcasts its location
    data.assets = null;
    data.locationFound = true;
    data.loadFailed = false;

    var VIEWS = ['bar', 'donut', 'pivot'];
    data.defaultView = VIEWS.indexOf(String(options.default_view)) > -1 ? String(options.default_view) : 'bar';
    var COLOR_BY = ['status', 'vendor'];
    data.defaultColorBy = COLOR_BY.indexOf(String(options.default_color_by)) > -1 ? String(options.default_color_by) : 'status';

    // Display text lives here so titles and messages can be updated in one place
    data.messages = {
        heading: gs.getMessage('Monitored Assets'),
        subHeading: gs.getMessage('Configuration items at this location by class and operational status or vendor.'),
        viewAll: gs.getMessage('View all'),
        viewLabel: gs.getMessage('View as'),
        colorLabel: gs.getMessage('Color by'),
        chooseLocation: gs.getMessage('Choose a location to see its site status.'),
        locationNotFound: gs.getMessage('Location not found.'),
        loadFailed: gs.getMessage('Monitored assets could not be loaded. Please try again later.'),
        empty: gs.getMessage('No monitored assets at this site.'),
        legendLabel: gs.getMessage('Operational status'),
        vendorLegendLabel: gs.getMessage('Vendor'),
        columnClass: gs.getMessage('Class'),
        columnTotal: gs.getMessage('Total'),
        totalAssets: gs.getMessage('Total assets'),
        // Placeholders are filled in on the client; {0} is a class, vendor or status name, the rest are counts
        barSummary: gs.getMessage('{0}: {1} assets'),
        segmentTip: gs.getMessage('{0} · {1}: {2}'),
        donutTip: gs.getMessage('{0}: {1} ({2}%)'),
        cellLink: gs.getMessage('{0}, {1}: {2}, view list')
    };
    data.views = [
        { id: 'bar', label: gs.getMessage('Bar chart') },
        { id: 'donut', label: gs.getMessage('Donut chart') },
        { id: 'pivot', label: gs.getMessage('Pivot table') }
    ];
    // Color by is only offered once a site has at least two vendors
    data.colorOptions = [
        { id: 'status', label: gs.getMessage('Operational status') },
        { id: 'vendor', label: gs.getMessage('Vendor') }
    ];

    if (input && input.action === 'getAssets') {
        try {
            var assets = new SiteStatusUtility().getMonitoredAssets(input.locationId, {
                includeChildLocations: String(options.include_child_locations) !== 'false',
                ciTable: options.ci_table,
                ciFilter: options.ci_filter,
                maxClasses: parseInt(options.max_classes, 10),
                // The Script Include falls back to status for anything else, or when the site has under two vendors
                colorBy: COLOR_BY.indexOf(String(input.colorBy)) > -1 ? String(input.colorBy) : data.defaultColorBy
            });
            // null means the location was not found
            data.locationFound = assets !== null;
            data.assets = assets;
            if (assets) addListUrls(assets);
        } catch (e) {
            gs.error('Monitored Assets: could not load assets for ' + input.locationId + ': ' + e);
            data.loadFailed = true;
        }
    }

    // Every count links to the list of the records it counts, like the Site Status Cards values
    function addListUrls(assets) {
        var listPage = options.list_page || '';
        function listUrl(query) {
            return listPage
                ? '?id=' + encodeURIComponent(listPage) + '&table=' + encodeURIComponent(assets.table) +
                      '&filter=' + encodeURIComponent(query)
                : '/' + assets.table + '_list.do?sysparm_query=' + encodeURIComponent(query);
        }
        assets.url = listUrl(assets.query);
        assets.series.forEach(function (series) {
            series.url = listUrl(series.query);
            delete series.query;
        });
        assets.rows.forEach(function (row) {
            row.url = listUrl(row.query);
            delete row.query;
            row.cells.forEach(function (cell) {
                cell.url = listUrl(cell.query);
                delete cell.query;
            });
        });
        delete assets.query;
    }
})();
