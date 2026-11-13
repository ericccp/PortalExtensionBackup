api.controller = function($scope, $timeout, $window, $document, i18n) {
    /*
     * Events being $broadcast:
     *   None.
     *
     * Events being $emit:
     *   None.
     *
     * Events being spied $on:
     *   sn_ex_sp.exportAssets - handles the export request, downloads CSV, and calls its completion callback. Broadcasting Widget: EC Asset Tabs.
     *   sn_ex_sp.assetDisplayViewUpdated - updates the card/list display from the view payload. Broadcasting Widget: EC Asset Tabs.
     */
    var c = this;
    c.CARD_VIEW = "card";

    if ($('.sp-page-root').width() < 768) {
        c.data.view = c.CARD_VIEW;
    }

    $scope.assetCards = c.data.assetCards || [];
    c.assetData = c.data.assetData || [];

    // Column sets mirror what each tab's list view shows (EC Asset List Item).
    var hardwareExportColumns = [
        ['Device', 'title'], ['Asset tag', 'assetTag'], ['Serial number', 'serialNumber'],
        ['Category', 'model_category'], ['Model', 'model'], ['Manufacturer', 'manufacturer'],
        ['State', 'install_status'], ['Assigned to', 'assigned_to'], ['Reserved for', 'reserved_for'],
        ['Cost center', 'cost_center'], ['Location', 'location']
    ];

    var softwareExportColumns = [
        ['Product name', 'title'], ['Publisher', 'manufacturer'], ['Status', 'install_status'],
        ['Assigned to', 'assigned_to'], ['Cost center', 'cost_center'], ['Cost', 'unit_cost'],
        ['Subscription period', function(row) {
            return row.software && row.software.subscriptionPeriod;
        }]
    ];

    function getExportColumns() {
        return c.data.isSoftwareTab ? softwareExportColumns : hardwareExportColumns;
    }

    function getCellValue(row, field) {
        return typeof field === 'function' ? field(row) : row[field];
    }

    function csvCell(value) {
        var text = value === undefined || value === null ? '' : String(value);
        // Prevent spreadsheet formulas from executing when a CSV is opened.
        if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function downloadCsv(rows) {
        var exportColumns = getExportColumns();
        var lines = [exportColumns.map(function(column) {
            return csvCell(i18n.getMessage(column[0]));
        }).join(',')];
        rows.forEach(function(row) {
            lines.push(exportColumns.map(function(column) {
                return csvCell(getCellValue(row, column[1]));
            }).join(','));
        });
        var blob = new $window.Blob(['\ufeff' + lines.join('\r\n')], {
            type: 'text/csv;charset=utf-8;'
        });
        var url = $window.URL.createObjectURL(blob);
        var link = $document[0].createElement('a');
        link.href = url;
        link.download = (c.data.isSoftwareTab ? 'software-' : 'hardware-') + 'assets-' +
            new Date().toISOString().slice(0, 10) + '.csv';
        link.style.display = 'none';
        try {
            $document[0].body.appendChild(link);
            link.click();
        } finally {
            if (link.parentNode) link.parentNode.removeChild(link);
            $timeout(function() { $window.URL.revokeObjectURL(url); }, 1000);
        }
    }

    $scope.$on('sn_ex_sp.exportAssets', function(event, request) {
        if (request.handled) return;
        request.handled = true;
        if ($scope.isLoading) {
            request.complete(i18n.getMessage('Assets are still loading. Please try again.'));
            return;
        }
        var loadedAssets = angular.copy(c.assetData);
        c.server.get({
            action: 'exportAssets',
            tabId: c.data.tabId,
            hardwareTabId: c.data.hardwareTabId,
            softwareTabId: c.data.softwareTabId,
            uiFilters: c.data.uiFilters,
            searchParam: c.data.searchParam,
            statusFilter: c.data.statusFilter,
            sortOption: c.data.sortOption,
            includeSkipLevels: c.data.includeSkipLevels,
            isDraftTab: c.data.isDraftTab
        }).then(function(response) {
            var result = response.data.exportResult;
            var rows;
            if (result && result.status === 'not_implemented') {
                rows = loadedAssets;
            } else if (result && result.status === 'ready' && Array.isArray(result.rows)) {
                rows = result.rows;
            } else {
                throw new Error('Invalid export response');
            }
            if (!rows.length) {
                request.complete(i18n.getMessage('There are no assets to export.'));
                return;
            }
            downloadCsv(rows);
            request.complete();
        }).catch(function() {
            request.complete(i18n.getMessage('Unable to export assets. Please try again.'));
        });
    });

    c.getMoreAssets = function() {
        $scope.isLoading = true;
        var focusIndex = $scope.assetCards.length;
        c.server.get({
            action: 'loadMoreAssets',
            tabId: c.data.tabId,
            hardwareTabId: c.data.hardwareTabId,
            softwareTabId: c.data.softwareTabId,
            uiFilters: c.data.uiFilters,
            limit: c.data.limit,
            searchParam: c.data.searchParam,
            lastRenderedCard: c.data.lastRenderedCard,
            isDraftTab: c.data.isDraftTab,
            statusFilter: c.data.statusFilter,
            sortOption: c.data.sortOption,
            includeSkipLevels: c.data.includeSkipLevels,
            offset: c.data.offset,
            view: c.data.view,
            existingAssetData: c.assetData
        }).then(function(resp) {
            c.data.lastRenderedCard = resp.data.lastRenderedCard;
            c.data.showMore = resp.data.showMore;
            c.data.offset = resp.data.offset;
            c.assetData = c.assetData.concat(resp.data.nextAssetData || []);
            c.data.assetData = c.assetData;
            $scope.assetCards = $scope.assetCards.concat(resp.data.nextAssetCards || []);
            c.data.assetListWidget = resp.data.assetListWidget;
            $scope.isLoading = false;
            $timeout(function() {
                $('.asset-card-title').get(focusIndex).focus();
            }, 100);
        });
    };

    $scope.$on('sn_ex_sp.assetDisplayViewUpdated', function(event, data) {
        if (data && data.view) {
            c.data.view = data.view;
        }
    });

    function getResponseData(resp) {
        if (resp && resp.data && resp.data.result && resp.data.result.data) {
            return resp.data.result.data;
        }

        return resp && resp.data ? resp.data : {};
    }
};
