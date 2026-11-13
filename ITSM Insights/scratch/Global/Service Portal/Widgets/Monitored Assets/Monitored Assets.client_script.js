api.controller = function ($rootScope, $scope) {
    /*
     * Events being $broadcast:
     *   siteStatusHeader.requestLocation - on $rootScope, asks the header to re-send its location.
     *     Receiving Widget: Site Status Header.
     *
     * Events being $emit:
     *   None.
     *
     * Events being spied $on:
     *   siteStatusHeader.location - listens on $rootScope and loads the assets. Emitting Widget: Site Status Header.
     *   $destroy - unregisters root-scope listeners. Source: AngularJS scope lifecycle.
     */
    var c = this;

    var LOCATION_EVENT = 'siteStatusHeader.location';
    var LOCATION_REQUEST_EVENT = 'siteStatusHeader.requestLocation';
    // Donut geometry in viewBox units; GAP is the surface gap left between segments
    var DONUT_RADIUS = 42;
    var DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
    var DONUT_GAP = 1.5;

    c.loading = true;
    c.locationId = null;
    c.noLocation = false;
    c.view = c.data.defaultView;
    c.colorBy = c.data.defaultColorBy;
    c.donutRadius = DONUT_RADIUS;
    c.donut = [];
    c.maxRowTotal = 0;

    // Fills {0}, {1}, ... in a message from data.messages
    function format(message, args) {
        return message.replace(/\{(\d+)\}/g, function (match, index) {
            return args[index] !== undefined ? args[index] : match;
        });
    }

    function seriesLabel(seriesId) {
        var series = c.data.assets.series;
        for (var i = 0; i < series.length; i++) if (series[i].id === seriesId) return series[i].label;
        return '';
    }

    function percent(count, total) {
        return total ? Math.round((count / total) * 100) : 0;
    }

    c.hasAssets = function () {
        return !!(c.data.assets && c.data.assets.total);
    };

    // Splitting by vendor only means something once a site has two vendors to tell apart
    c.canColorByVendor = function () {
        return !!(c.data.assets && c.data.assets.vendorCount > 1);
    };

    // Follows what the server used, which falls back to status when the site has under two vendors
    c.legendLabel = function () {
        return c.data.assets && c.data.assets.colorBy === 'vendor'
            ? c.data.messages.vendorLegendLabel
            : c.data.messages.legendLabel;
    };

    // Segments, donut slices and legend marks look the cell's series up for its color and shape
    c.toneOf = function (seriesId) {
        var series = c.data.assets.series;
        for (var i = 0; i < series.length; i++) if (series[i].id === seriesId) return series[i].tone;
        return 'other';
    };

    // Bars share one scale, so the largest class fills the track; the CSS turns the share into a width
    c.barShare = function (row) {
        return c.maxRowTotal ? row.total / c.maxRowTotal : 0;
    };

    c.segmentTip = function (row, cell) {
        return format(c.data.messages.segmentTip, [row.label, seriesLabel(cell.seriesId), cell.count]);
    };

    // Screen readers get each bar as one sentence instead of unlabeled segments
    c.rowSummary = function (row) {
        var parts = row.cells
            .filter(function (cell) {
                return cell.count > 0;
            })
            .map(function (cell) {
                return seriesLabel(cell.seriesId) + ' ' + cell.count;
            });
        return format(c.data.messages.barSummary, [row.label, row.total]) + '; ' + parts.join(', ');
    };

    c.cellLabel = function (row, cell) {
        return format(c.data.messages.cellLink, [row.label, seriesLabel(cell.seriesId), cell.count]);
    };

    c.seriesPercent = function (series) {
        return percent(series.count, c.data.assets.total);
    };

    function buildDonut() {
        var assets = c.data.assets;
        var gap = assets.series.length > 1 ? DONUT_GAP : 0;
        var start = 0;
        c.donut = assets.series.map(function (series) {
            var length = (series.count / assets.total) * DONUT_CIRCUMFERENCE;
            var segment = {
                id: series.id,
                tone: series.tone,
                dashArray: Math.max(length - gap, 0.5) + ' ' + DONUT_CIRCUMFERENCE,
                dashOffset: -start,
                tip: format(c.data.messages.donutTip, [series.label, series.count, percent(series.count, assets.total)])
            };
            start += length;
            return segment;
        });
    }

    function prepare() {
        c.maxRowTotal = 0;
        c.donut = [];
        if (!c.hasAssets()) return;
        c.data.assets.rows.forEach(function (row) {
            c.maxRowTotal = Math.max(c.maxRowTotal, row.total);
        });
        buildDonut();
    }

    // Counts each request so only the latest location and Color by choice are shown
    var requestSeq = 0;

    function fetchAssets() {
        var seq = ++requestSeq;
        c.loading = true;
        c.server
            .get({ action: 'getAssets', locationId: c.locationId, colorBy: c.colorBy })
            .then(function (response) {
                // A newer selection was made while this request was running
                if (seq !== requestSeq) return;
                c.data.assets = response.data.assets;
                c.data.locationFound = response.data.locationFound;
                c.data.loadFailed = response.data.loadFailed;
                prepare();
            })
            .finally(function () {
                if (seq === requestSeq) c.loading = false;
            });
    }

    function loadAssets(event, location) {
        var locationId = (location && location.sys_id) || '';
        if (!location || locationId === c.locationId) return;
        c.locationId = locationId;
        // The Site Status Header sends an empty location when none is selected and the page has no default
        c.noLocation = !locationId;
        if (c.noLocation) {
            requestSeq++;
            c.data.assets = null;
            c.data.locationFound = true;
            c.data.loadFailed = false;
            c.loading = false;
            return;
        }
        fetchAssets();
    }

    var unbindLocation = $rootScope.$on(LOCATION_EVENT, loadAssets);
    $scope.$on('$destroy', unbindLocation);

    // Changing Color by reloads the counts for the current location; the first run is the initial value
    $scope.$watch(
        function () {
            return c.colorBy;
        },
        function (colorBy, previous) {
            if (colorBy !== previous && c.locationId) fetchAssets();
        }
    );

    // Covers the case where the header broadcast before this widget was listening
    $rootScope.$broadcast(LOCATION_REQUEST_EVENT);
};
